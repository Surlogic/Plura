package com.plura.plurabackend.auth;

import com.plura.plurabackend.auth.dto.PhoneVerificationSendResponse;
import com.plura.plurabackend.auth.model.AuthAuditEventType;
import com.plura.plurabackend.auth.model.AuthAuditStatus;
import com.plura.plurabackend.auth.model.PhoneVerificationChallenge;
import com.plura.plurabackend.auth.model.PhoneVerificationChannel;
import com.plura.plurabackend.auth.repository.PhoneVerificationChallengeRepository;
import com.plura.plurabackend.user.model.User;
import com.plura.plurabackend.user.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PhoneVerificationService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PhoneVerificationChallengeRepository phoneVerificationChallengeRepository;
    private final PhoneVerificationNotificationSender phoneVerificationNotificationSender;
    private final AuthAuditService authAuditService;
    private final String phoneVerificationPepper;
    private final long ttlMinutes;
    private final long cooldownSeconds;
    private final int maxAttempts;

    public PhoneVerificationService(
        UserRepository userRepository,
        PhoneVerificationChallengeRepository phoneVerificationChallengeRepository,
        PhoneVerificationNotificationSender phoneVerificationNotificationSender,
        AuthAuditService authAuditService,
        @Value("${app.auth.phone-verification.pepper:${jwt.refresh-pepper}}") String phoneVerificationPepper,
        @Value("${app.auth.phone-verification.ttl-minutes:10}") long ttlMinutes,
        @Value("${app.auth.phone-verification.cooldown-seconds:60}") long cooldownSeconds,
        @Value("${app.auth.phone-verification.max-attempts:5}") int maxAttempts
    ) {
        this.userRepository = userRepository;
        this.phoneVerificationChallengeRepository = phoneVerificationChallengeRepository;
        this.phoneVerificationNotificationSender = phoneVerificationNotificationSender;
        this.authAuditService = authAuditService;
        this.phoneVerificationPepper = phoneVerificationPepper;
        this.ttlMinutes = ttlMinutes;
        this.cooldownSeconds = cooldownSeconds;
        this.maxAttempts = maxAttempts;
    }

    @Transactional
    public PhoneVerificationSendResponse sendVerificationCode(String rawUserId, String requestedPhoneNumber) {
        User user = loadActiveUser(rawUserId);
        String currentPhoneNumber = normalizePhoneNumber(user.getPhoneNumber());
        String normalizedRequestedPhoneNumber = normalizeOptionalPhoneNumber(requestedPhoneNumber);
        if (normalizedRequestedPhoneNumber != null && !normalizedRequestedPhoneNumber.equals(currentPhoneNumber)) {
            throw new AuthApiException(
                HttpStatus.BAD_REQUEST,
                "PHONE_MISMATCH",
                "Solo podés verificar el teléfono actual de tu cuenta."
            );
        }

        if (user.getPhoneVerifiedAt() != null) {
            return new PhoneVerificationSendResponse("El teléfono ya está verificado.", 0L);
        }

        LocalDateTime now = LocalDateTime.now();
        PhoneVerificationChallenge activeChallenge = phoneVerificationChallengeRepository
            .findFirstByUser_IdAndConsumedAtIsNullOrderByCreatedAtDesc(user.getId())
            .orElse(null);

        if (activeChallenge != null && activeChallenge.getExpiresAt().isBefore(now)) {
            activeChallenge.setConsumedAt(now);
            phoneVerificationChallengeRepository.save(activeChallenge);
            activeChallenge = null;
        }

        if (activeChallenge != null) {
            LocalDateTime availableAt = activeChallenge.getCreatedAt().plusSeconds(cooldownSeconds);
            if (availableAt.isAfter(now)) {
                long remaining = Duration.between(now, availableAt).getSeconds();
                return new PhoneVerificationSendResponse(
                    "Ya te enviamos un código recientemente. Esperá unos segundos antes de reenviar.",
                    Math.max(1L, remaining)
                );
            }
            activeChallenge.setConsumedAt(now);
            phoneVerificationChallengeRepository.save(activeChallenge);
        }

        phoneVerificationChallengeRepository.consumeActiveChallengesByUserId(user.getId(), now);

        String rawCode = generateCode();
        PhoneVerificationChallenge challenge = new PhoneVerificationChallenge();
        challenge.setUser(user);
        challenge.setPhoneNumber(currentPhoneNumber);
        challenge.setCodeHash(hashCode(rawCode));
        challenge.setExpiresAt(now.plusMinutes(ttlMinutes));
        challenge.setAttemptCount(0);
        challenge.setMaxAttempts(maxAttempts);
        challenge.setChannel(PhoneVerificationChannel.SMS);
        phoneVerificationChallengeRepository.save(challenge);

        phoneVerificationNotificationSender.sendVerificationCode(
            new PhoneVerificationNotificationSender.PhoneVerificationNotification(user, currentPhoneNumber, rawCode)
        );
        authAuditService.log(
            AuthAuditEventType.PHONE_VERIFICATION_SENT,
            AuthAuditStatus.SUCCESS,
            user.getId(),
            null,
            null,
            null,
            Map.of("phoneNumber", currentPhoneNumber)
        );

        return new PhoneVerificationSendResponse("Te enviamos un código de verificación por SMS.", cooldownSeconds);
    }

    @Transactional(noRollbackFor = AuthApiException.class)
    public void confirmVerificationCode(String rawUserId, String rawCode) {
        User user = loadActiveUser(rawUserId);
        String currentPhoneNumber = normalizePhoneNumber(user.getPhoneNumber());
        if (user.getPhoneVerifiedAt() != null) {
            throw auditFailure(user, HttpStatus.CONFLICT, "ALREADY_VERIFIED", "El teléfono ya está verificado.");
        }

        String normalizedCode = normalizeSubmittedCode(rawCode);
        LocalDateTime now = LocalDateTime.now();
        PhoneVerificationChallenge challenge = phoneVerificationChallengeRepository
            .findFirstByUser_IdOrderByCreatedAtDesc(user.getId())
            .orElseThrow(() -> auditFailure(user, HttpStatus.BAD_REQUEST, "CODE_INVALID", "Código inválido."));

        if (challenge.getConsumedAt() != null) {
            if (hasAttemptsExceeded(challenge)) {
                throw auditFailure(user, HttpStatus.BAD_REQUEST, "ATTEMPTS_EXCEEDED", "Superaste la cantidad máxima de intentos. Solicitá un nuevo código.");
            }
            if (challenge.getExpiresAt().isBefore(now)) {
                throw auditFailure(user, HttpStatus.BAD_REQUEST, "CODE_EXPIRED", "Código expirado.");
            }
            throw auditFailure(user, HttpStatus.BAD_REQUEST, "CODE_INVALID", "Código inválido.");
        }

        if (!currentPhoneNumber.equals(normalizePhoneNumber(challenge.getPhoneNumber()))) {
            challenge.setConsumedAt(now);
            phoneVerificationChallengeRepository.save(challenge);
            throw auditFailure(user, HttpStatus.BAD_REQUEST, "CODE_INVALID", "Código inválido.");
        }
        if (challenge.getExpiresAt().isBefore(now)) {
            challenge.setConsumedAt(now);
            phoneVerificationChallengeRepository.save(challenge);
            throw auditFailure(user, HttpStatus.BAD_REQUEST, "CODE_EXPIRED", "Código expirado.");
        }
        if (hasAttemptsExceeded(challenge)) {
            challenge.setConsumedAt(now);
            phoneVerificationChallengeRepository.save(challenge);
            throw auditFailure(user, HttpStatus.BAD_REQUEST, "ATTEMPTS_EXCEEDED", "Superaste la cantidad máxima de intentos. Solicitá un nuevo código.");
        }

        if (!hashCode(normalizedCode).equals(challenge.getCodeHash())) {
            int nextAttemptCount = (challenge.getAttemptCount() == null ? 0 : challenge.getAttemptCount()) + 1;
            challenge.setAttemptCount(nextAttemptCount);
            int configuredMaxAttempts = resolveMaxAttempts(challenge);
            if (nextAttemptCount >= configuredMaxAttempts) {
                challenge.setConsumedAt(now);
                phoneVerificationChallengeRepository.save(challenge);
                throw auditFailure(user, HttpStatus.BAD_REQUEST, "ATTEMPTS_EXCEEDED", "Superaste la cantidad máxima de intentos. Solicitá un nuevo código.");
            }
            phoneVerificationChallengeRepository.save(challenge);
            throw auditFailure(user, HttpStatus.BAD_REQUEST, "CODE_INVALID", "Código inválido.");
        }

        user.setPhoneVerifiedAt(now);
        userRepository.save(user);
        challenge.setConsumedAt(now);
        phoneVerificationChallengeRepository.save(challenge);
        phoneVerificationChallengeRepository.consumeActiveChallengesByUserId(user.getId(), now);
        authAuditService.log(
            AuthAuditEventType.PHONE_VERIFIED,
            AuthAuditStatus.SUCCESS,
            user.getId(),
            null,
            null,
            null,
            Map.of("phoneNumber", currentPhoneNumber)
        );
    }

    private User loadActiveUser(String rawUserId) {
        Long userId;
        try {
            userId = Long.valueOf(rawUserId);
        } catch (NumberFormatException exception) {
            throw new AuthApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Usuario no autenticado.");
        }
        return userRepository.findByIdAndDeletedAtIsNull(userId)
            .orElseThrow(() -> new AuthApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Usuario no encontrado."));
    }

    private String generateCode() {
        int value = SECURE_RANDOM.nextInt(900000) + 100000;
        return String.valueOf(value);
    }

    private String hashCode(String rawCode) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest((rawCode + phoneVerificationPepper).getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception exception) {
            throw new IllegalStateException("No se pudo hashear el código de verificación", exception);
        }
    }

    private String normalizeSubmittedCode(String rawCode) {
        if (rawCode == null) {
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "CODE_INVALID", "Código inválido.");
        }
        String trimmed = rawCode.trim();
        if (trimmed.length() != 6 || !trimmed.chars().allMatch(Character::isDigit)) {
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "CODE_INVALID", "Código inválido.");
        }
        return trimmed;
    }

    private String normalizeOptionalPhoneNumber(String rawPhoneNumber) {
        if (rawPhoneNumber == null) {
            return null;
        }
        StringBuilder normalized = new StringBuilder();
        String trimmed = rawPhoneNumber.trim();
        for (int index = 0; index < trimmed.length(); index += 1) {
            char current = trimmed.charAt(index);
            if (Character.isDigit(current)) {
                normalized.append(current);
            } else if (current == '+' && normalized.isEmpty()) {
                normalized.append(current);
            }
        }
        if (normalized.length() == 0 || normalized.toString().equals("+")) {
            return null;
        }
        return normalized.toString();
    }

    private String normalizePhoneNumber(String rawPhoneNumber) {
        String normalized = normalizeOptionalPhoneNumber(rawPhoneNumber);
        if (normalized == null) {
            throw new AuthApiException(
                HttpStatus.BAD_REQUEST,
                "PHONE_MISSING",
                "Tu cuenta no tiene un teléfono cargado para verificar."
            );
        }
        return normalized;
    }

    private boolean hasAttemptsExceeded(PhoneVerificationChallenge challenge) {
        return (challenge.getAttemptCount() == null ? 0 : challenge.getAttemptCount()) >= resolveMaxAttempts(challenge);
    }

    private int resolveMaxAttempts(PhoneVerificationChallenge challenge) {
        if (challenge.getMaxAttempts() == null || challenge.getMaxAttempts() <= 0) {
            return maxAttempts;
        }
        return challenge.getMaxAttempts();
    }

    private AuthApiException auditFailure(User user, HttpStatus status, String code, String message) {
        authAuditService.log(
            AuthAuditEventType.PHONE_VERIFICATION_FAILURE,
            AuthAuditStatus.FAILURE,
            user.getId(),
            null,
            null,
            null,
            Map.of("reason", code, "phoneNumber", normalizePhoneNumber(user.getPhoneNumber()))
        );
        return new AuthApiException(status, code, message);
    }
}
