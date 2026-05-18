package com.plura.plurabackend.core.auth;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.plura.plurabackend.core.auth.dto.PhoneVerificationSendResponse;
import com.plura.plurabackend.core.auth.dto.RegistrationPhoneVerificationConfirmResponse;
import com.plura.plurabackend.core.auth.model.RegistrationPhoneVerificationAttempt;
import com.plura.plurabackend.core.auth.repository.RegistrationPhoneVerificationAttemptRepository;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Verificacion telefonica previa al alta. Vonage valida el OTP y backend emite
 * un token corto para atar esa aprobacion al submit final del registro.
 */
@Service
public class RegistrationPhoneVerificationService {

    private static final String TOKEN_PURPOSE = "registration_phone";

    private final VonageVerifyClient vonageVerifyClient;
    private final RegistrationPhoneVerificationAttemptRepository attemptRepository;
    private final Algorithm tokenAlgorithm;
    private final boolean required;
    private final long tokenTtlMinutes;
    private final long resendCooldownSeconds;

    public RegistrationPhoneVerificationService(
        VonageVerifyClient vonageVerifyClient,
        RegistrationPhoneVerificationAttemptRepository attemptRepository,
        @Value("${app.auth.registration-phone-verification.required:false}") boolean required,
        @Value("${app.auth.registration-phone-verification.token-secret:${jwt.refresh-pepper}}") String tokenSecret,
        @Value("${app.auth.registration-phone-verification.token-ttl-minutes:15}") long tokenTtlMinutes,
        @Value("${app.auth.registration-phone-verification.cooldown-seconds:60}") long resendCooldownSeconds
    ) {
        if (tokenSecret == null || tokenSecret.isBlank()) {
            throw new IllegalStateException("AUTH_REGISTRATION_PHONE_VERIFICATION_TOKEN_SECRET no esta configurado");
        }
        this.vonageVerifyClient = vonageVerifyClient;
        this.attemptRepository = attemptRepository;
        this.tokenAlgorithm = Algorithm.HMAC256(tokenSecret);
        this.required = required;
        this.tokenTtlMinutes = tokenTtlMinutes;
        this.resendCooldownSeconds = resendCooldownSeconds;
    }

    @Transactional
    public PhoneVerificationSendResponse sendCode(String rawPhoneNumber) {
        String normalizedPhone = normalizeRequiredPhoneNumber(rawPhoneNumber);
        LocalDateTime now = LocalDateTime.now();
        RegistrationPhoneVerificationAttempt activeAttempt = attemptRepository
            .findFirstByPhoneNumberAndConsumedAtIsNullOrderByCreatedAtDesc(normalizedPhone)
            .orElse(null);

        if (activeAttempt != null && activeAttempt.getExpiresAt().isBefore(now)) {
            activeAttempt.setConsumedAt(now);
            attemptRepository.save(activeAttempt);
            activeAttempt = null;
        }

        if (activeAttempt != null) {
            LocalDateTime availableAt = activeAttempt.getCreatedAt().plusSeconds(resendCooldownSeconds);
            if (availableAt.isAfter(now)) {
                long remaining = Duration.between(now, availableAt).getSeconds();
                return new PhoneVerificationSendResponse(
                    "Ya te enviamos un codigo recientemente. Espera unos segundos antes de reenviar.",
                    Math.max(1L, remaining)
                );
            }
            activeAttempt.setConsumedAt(now);
            attemptRepository.save(activeAttempt);
        }

        attemptRepository.consumeActiveAttemptsByPhoneNumber(normalizedPhone, now);
        String providerRequestId = vonageVerifyClient.startSmsVerification(normalizedPhone);
        RegistrationPhoneVerificationAttempt attempt = new RegistrationPhoneVerificationAttempt();
        attempt.setPhoneNumber(normalizedPhone);
        attempt.setProviderRequestId(providerRequestId);
        attempt.setExpiresAt(now.plusMinutes(tokenTtlMinutes));
        attemptRepository.save(attempt);
        return new PhoneVerificationSendResponse(
            "Te enviamos un codigo de verificacion por SMS.",
            resendCooldownSeconds
        );
    }

    @Transactional(noRollbackFor = AuthApiException.class)
    public RegistrationPhoneVerificationConfirmResponse confirmCode(String rawPhoneNumber, String rawCode) {
        String normalizedPhone = normalizeRequiredPhoneNumber(rawPhoneNumber);
        String normalizedCode = normalizeSubmittedCode(rawCode);
        LocalDateTime now = LocalDateTime.now();
        RegistrationPhoneVerificationAttempt attempt = attemptRepository
            .findFirstByPhoneNumberAndConsumedAtIsNullOrderByCreatedAtDesc(normalizedPhone)
            .orElse(null);

        if (attempt == null) {
            RegistrationPhoneVerificationAttempt latestAttempt = attemptRepository
                .findFirstByPhoneNumberOrderByCreatedAtDesc(normalizedPhone)
                .orElse(null);
            if (latestAttempt != null && latestAttempt.getExpiresAt().isBefore(now)) {
                throw new AuthApiException(HttpStatus.BAD_REQUEST, "CODE_EXPIRED", "Codigo expirado.");
            }
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "CODE_INVALID", "Codigo invalido.");
        }

        if (attempt.getExpiresAt().isBefore(now)) {
            attempt.setConsumedAt(now);
            attemptRepository.save(attempt);
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "CODE_EXPIRED", "Codigo expirado.");
        }

        if (!vonageVerifyClient.checkSmsVerification(attempt.getProviderRequestId(), normalizedCode)) {
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "CODE_INVALID", "Codigo invalido.");
        }
        attempt.setConsumedAt(now);
        attemptRepository.save(attempt);
        attemptRepository.consumeActiveAttemptsByPhoneNumber(normalizedPhone, now);

        Instant expiresAt = Instant.now().plus(tokenTtlMinutes, ChronoUnit.MINUTES);
        String token = JWT.create()
            .withSubject(normalizedPhone)
            .withClaim("purpose", TOKEN_PURPOSE)
            .withIssuedAt(Date.from(Instant.now()))
            .withExpiresAt(Date.from(expiresAt))
            .sign(tokenAlgorithm);
        return new RegistrationPhoneVerificationConfirmResponse(token, expiresAt);
    }

    public VerificationResult resolveForRegistration(String rawPhoneNumber, String token) {
        String normalizedPhone = normalizeRequiredPhoneNumber(rawPhoneNumber);
        if (token == null || token.isBlank()) {
            if (required) {
                throw new AuthApiException(
                    HttpStatus.BAD_REQUEST,
                    "PHONE_VERIFICATION_REQUIRED",
                    "Necesitas verificar tu telefono antes de crear la cuenta."
                );
            }
            return new VerificationResult(normalizedPhone, false);
        }
        DecodedJWT decoded = verifyToken(token);
        if (!TOKEN_PURPOSE.equals(decoded.getClaim("purpose").asString()) || !normalizedPhone.equals(decoded.getSubject())) {
            throw new AuthApiException(
                HttpStatus.BAD_REQUEST,
                "PHONE_VERIFICATION_INVALID",
                "La verificacion del telefono no coincide con el numero enviado."
            );
        }
        return new VerificationResult(normalizedPhone, true);
    }

    public VerificationResult resolveOptionalForRegistration(String rawPhoneNumber, String token) {
        String normalizedPhone = normalizeRequiredPhoneNumber(rawPhoneNumber);
        if (token == null || token.isBlank()) {
            return new VerificationResult(normalizedPhone, false);
        }
        DecodedJWT decoded = verifyToken(token);
        if (!TOKEN_PURPOSE.equals(decoded.getClaim("purpose").asString()) || !normalizedPhone.equals(decoded.getSubject())) {
            throw new AuthApiException(
                HttpStatus.BAD_REQUEST,
                "PHONE_VERIFICATION_INVALID",
                "La verificacion del telefono no coincide con el numero enviado."
            );
        }
        return new VerificationResult(normalizedPhone, true);
    }

    private DecodedJWT verifyToken(String token) {
        try {
            return JWT.require(tokenAlgorithm).build().verify(token.trim());
        } catch (JWTVerificationException exception) {
            throw new AuthApiException(
                HttpStatus.BAD_REQUEST,
                "PHONE_VERIFICATION_INVALID",
                "La verificacion del telefono vencio o no es valida."
            );
        }
    }

    private String normalizeSubmittedCode(String rawCode) {
        if (rawCode == null) {
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "CODE_INVALID", "Codigo invalido.");
        }
        String trimmed = rawCode.trim();
        if (trimmed.length() < 4 || trimmed.length() > 10 || !trimmed.chars().allMatch(Character::isDigit)) {
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "CODE_INVALID", "Codigo invalido.");
        }
        return trimmed;
    }

    private String normalizeRequiredPhoneNumber(String rawPhoneNumber) {
        String normalized = normalizePhoneNumber(rawPhoneNumber);
        if (normalized == null) {
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "PHONE_INVALID", "Telefono invalido.");
        }
        return normalized;
    }

    private String normalizePhoneNumber(String value) {
        if (value == null) {
            return null;
        }
        String collapsed = value.trim()
            .replace(" ", "")
            .replace("-", "")
            .replace("(", "")
            .replace(")", "");
        if (!collapsed.startsWith("+")) {
            return null;
        }
        String digits = collapsed.substring(1).replaceAll("\\D", "");
        return digits.length() >= 8 && digits.length() <= 20 ? "+" + digits : null;
    }

    public record VerificationResult(String phoneNumber, boolean verified) {}
}
