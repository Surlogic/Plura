package com.plura.plurabackend.core.auth;

import com.plura.plurabackend.core.auth.dto.EmailVerificationSendResponse;
import com.plura.plurabackend.core.auth.model.AuthAuditEventType;
import com.plura.plurabackend.core.auth.model.AuthAuditStatus;
import com.plura.plurabackend.core.auth.model.EmailVerificationChallenge;
import com.plura.plurabackend.core.auth.model.EmailVerificationChannel;
import com.plura.plurabackend.core.auth.repository.EmailVerificationChallengeRepository;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EmailVerificationService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final EmailVerificationChallengeRepository emailVerificationChallengeRepository;
    private final EmailVerificationNotificationSender emailVerificationNotificationSender;
    private final AuthAuditService authAuditService;
    private final String emailVerificationPepper;
    private final long ttlMinutes;
    private final long cooldownSeconds;
    private final int maxAttempts;

    public EmailVerificationService(
        UserRepository userRepository,
        EmailVerificationChallengeRepository emailVerificationChallengeRepository,
        EmailVerificationNotificationSender emailVerificationNotificationSender,
        AuthAuditService authAuditService,
        @Value("${app.auth.email-verification.pepper:${jwt.refresh-pepper}}") String emailVerificationPepper,
        @Value("${app.auth.email-verification.ttl-minutes:15}") long ttlMinutes,
        @Value("${app.auth.email-verification.cooldown-seconds:60}") long cooldownSeconds,
        @Value("${app.auth.email-verification.max-attempts:5}") int maxAttempts
    ) {
        this.userRepository = userRepository;
        this.emailVerificationChallengeRepository = emailVerificationChallengeRepository;
        this.emailVerificationNotificationSender = emailVerificationNotificationSender;
        this.authAuditService = authAuditService;
        this.emailVerificationPepper = emailVerificationPepper;
        this.ttlMinutes = ttlMinutes;
        this.cooldownSeconds = cooldownSeconds;
        this.maxAttempts = maxAttempts;
    }

    @Transactional
    public EmailVerificationSendResponse sendVerificationCode(String rawUserId, String requestedEmail) {
        User user = loadActiveUser(rawUserId);
        String currentEmail = normalizeEmail(user.getEmail());
        String normalizedRequestedEmail = normalizeOptionalEmail(requestedEmail);
        if (normalizedRequestedEmail != null && !normalizedRequestedEmail.equals(currentEmail)) {
            throw new AuthApiException(
                HttpStatus.BAD_REQUEST,
                "EMAIL_MISMATCH",
                "Solo podés verificar el email actual de tu cuenta."
            );
        }

        if (user.getEmailVerifiedAt() != null) {
            return new EmailVerificationSendResponse("El email ya está verificado.", 0L);
        }

        LocalDateTime now = LocalDateTime.now();
        EmailVerificationChallenge activeChallenge = emailVerificationChallengeRepository
            .findFirstByUser_IdAndConsumedAtIsNullOrderByCreatedAtDesc(user.getId())
            .orElse(null);

        if (activeChallenge != null && activeChallenge.getExpiresAt().isBefore(now)) {
            activeChallenge.setConsumedAt(now);
            emailVerificationChallengeRepository.save(activeChallenge);
            activeChallenge = null;
        }

        if (activeChallenge != null) {
            LocalDateTime availableAt = activeChallenge.getCreatedAt().plusSeconds(cooldownSeconds);
            if (availableAt.isAfter(now)) {
                long remaining = Duration.between(now, availableAt).getSeconds();
                return new EmailVerificationSendResponse(
                    "Ya te enviamos un código recientemente. Esperá unos segundos antes de reenviar.",
                    Math.max(1L, remaining)
                );
            }
            activeChallenge.setConsumedAt(now);
            emailVerificationChallengeRepository.save(activeChallenge);
        }

        emailVerificationChallengeRepository.consumeActiveChallengesByUserId(user.getId(), now);

        String rawCode = generateCode();
        EmailVerificationChallenge challenge = new EmailVerificationChallenge();
        challenge.setUser(user);
        challenge.setEmail(currentEmail);
        challenge.setCodeHash(hashCode(rawCode));
        challenge.setExpiresAt(now.plusMinutes(ttlMinutes));
        challenge.setAttemptCount(0);
        challenge.setMaxAttempts(maxAttempts);
        challenge.setChannel(EmailVerificationChannel.EMAIL);
        emailVerificationChallengeRepository.save(challenge);

        emailVerificationNotificationSender.sendVerificationCode(
            new EmailVerificationNotificationSender.EmailVerificationNotification(user, currentEmail, rawCode)
        );
        authAuditService.log(
            AuthAuditEventType.EMAIL_VERIFICATION_SENT,
            AuthAuditStatus.SUCCESS,
            user.getId(),
            null,
            null,
            null,
            Map.of("email", currentEmail)
        );

        return new EmailVerificationSendResponse("Te enviamos un código de verificación por email.", cooldownSeconds);
    }

    @Transactional(noRollbackFor = AuthApiException.class)
    public void confirmVerificationCode(String rawUserId, String rawCode) {
        User user = loadActiveUser(rawUserId);
        if (user.getEmailVerifiedAt() != null) {
            throw auditFailure(user, HttpStatus.CONFLICT, "ALREADY_VERIFIED", "El email ya está verificado.");
        }

        String normalizedCode = normalizeSubmittedCode(rawCode);
        LocalDateTime now = LocalDateTime.now();
        EmailVerificationChallenge challenge = emailVerificationChallengeRepository
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

        if (!normalizeEmail(user.getEmail()).equals(normalizeEmail(challenge.getEmail()))) {
            challenge.setConsumedAt(now);
            emailVerificationChallengeRepository.save(challenge);
            throw auditFailure(user, HttpStatus.BAD_REQUEST, "CODE_INVALID", "Código inválido.");
        }
        if (challenge.getExpiresAt().isBefore(now)) {
            challenge.setConsumedAt(now);
            emailVerificationChallengeRepository.save(challenge);
            throw auditFailure(user, HttpStatus.BAD_REQUEST, "CODE_EXPIRED", "Código expirado.");
        }
        if (hasAttemptsExceeded(challenge)) {
            challenge.setConsumedAt(now);
            emailVerificationChallengeRepository.save(challenge);
            throw auditFailure(user, HttpStatus.BAD_REQUEST, "ATTEMPTS_EXCEEDED", "Superaste la cantidad máxima de intentos. Solicitá un nuevo código.");
        }

        if (!hashCode(normalizedCode).equals(challenge.getCodeHash())) {
            int nextAttemptCount = (challenge.getAttemptCount() == null ? 0 : challenge.getAttemptCount()) + 1;
            challenge.setAttemptCount(nextAttemptCount);
            int configuredMaxAttempts = resolveMaxAttempts(challenge);
            if (nextAttemptCount >= configuredMaxAttempts) {
                challenge.setConsumedAt(now);
                emailVerificationChallengeRepository.save(challenge);
                throw auditFailure(user, HttpStatus.BAD_REQUEST, "ATTEMPTS_EXCEEDED", "Superaste la cantidad máxima de intentos. Solicitá un nuevo código.");
            }
            emailVerificationChallengeRepository.save(challenge);
            throw auditFailure(user, HttpStatus.BAD_REQUEST, "CODE_INVALID", "Código inválido.");
        }

        user.setEmailVerifiedAt(now);
        userRepository.save(user);
        challenge.setConsumedAt(now);
        emailVerificationChallengeRepository.save(challenge);
        emailVerificationChallengeRepository.consumeActiveChallengesByUserId(user.getId(), now);
        authAuditService.log(
            AuthAuditEventType.EMAIL_VERIFIED,
            AuthAuditStatus.SUCCESS,
            user.getId(),
            null,
            null,
            null,
            Map.of("email", normalizeEmail(user.getEmail()))
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
            byte[] hash = digest.digest((rawCode + emailVerificationPepper).getBytes(StandardCharsets.UTF_8));
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

    private String normalizeOptionalEmail(String email) {
        if (email == null) {
            return null;
        }
        String trimmed = email.trim().toLowerCase(Locale.ROOT);
        return trimmed.isBlank() ? null : trimmed;
    }

    private String normalizeEmail(String email) {
        String normalized = normalizeOptionalEmail(email);
        if (normalized == null) {
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "EMAIL_INVALID", "Email inválido.");
        }
        return normalized;
    }

    private boolean hasAttemptsExceeded(EmailVerificationChallenge challenge) {
        return (challenge.getAttemptCount() == null ? 0 : challenge.getAttemptCount()) >= resolveMaxAttempts(challenge);
    }

    private int resolveMaxAttempts(EmailVerificationChallenge challenge) {
        if (challenge.getMaxAttempts() == null || challenge.getMaxAttempts() <= 0) {
            return maxAttempts;
        }
        return challenge.getMaxAttempts();
    }

    private AuthApiException auditFailure(User user, HttpStatus status, String code, String message) {
        authAuditService.log(
            AuthAuditEventType.EMAIL_VERIFICATION_FAILURE,
            AuthAuditStatus.FAILURE,
            user.getId(),
            null,
            null,
            null,
            Map.of("reason", code, "email", normalizeEmail(user.getEmail()))
        );
        return new AuthApiException(status, code, message);
    }
}
