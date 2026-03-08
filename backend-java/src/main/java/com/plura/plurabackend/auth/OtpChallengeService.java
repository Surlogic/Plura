package com.plura.plurabackend.auth;

import com.plura.plurabackend.auth.dto.OtpChallengeSendResponse;
import com.plura.plurabackend.auth.model.AuthAuditEventType;
import com.plura.plurabackend.auth.model.AuthAuditStatus;
import com.plura.plurabackend.auth.model.AuthOtpChallenge;
import com.plura.plurabackend.auth.model.OtpChallengeChannel;
import com.plura.plurabackend.auth.model.OtpChallengePurpose;
import com.plura.plurabackend.auth.repository.AuthOtpChallengeRepository;
import com.plura.plurabackend.user.model.User;
import com.plura.plurabackend.user.repository.UserRepository;
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
public class OtpChallengeService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final AuthOtpChallengeRepository authOtpChallengeRepository;
    private final OtpChallengeNotificationSender otpChallengeNotificationSender;
    private final AuthAuditService authAuditService;
    private final String otpChallengePepper;
    private final long ttlMinutes;
    private final long cooldownSeconds;
    private final int maxAttempts;

    public OtpChallengeService(
        UserRepository userRepository,
        AuthOtpChallengeRepository authOtpChallengeRepository,
        OtpChallengeNotificationSender otpChallengeNotificationSender,
        AuthAuditService authAuditService,
        @Value("${app.auth.otp-challenge.pepper:${jwt.refresh-pepper}}") String otpChallengePepper,
        @Value("${app.auth.otp-challenge.ttl-minutes:10}") long ttlMinutes,
        @Value("${app.auth.otp-challenge.cooldown-seconds:60}") long cooldownSeconds,
        @Value("${app.auth.otp-challenge.max-attempts:5}") int maxAttempts
    ) {
        this.userRepository = userRepository;
        this.authOtpChallengeRepository = authOtpChallengeRepository;
        this.otpChallengeNotificationSender = otpChallengeNotificationSender;
        this.authAuditService = authAuditService;
        this.otpChallengePepper = otpChallengePepper;
        this.ttlMinutes = ttlMinutes;
        this.cooldownSeconds = cooldownSeconds;
        this.maxAttempts = maxAttempts;
    }

    @Transactional
    public OtpChallengeSendResponse sendChallenge(
        String rawUserId,
        String currentSessionId,
        String rawPurpose,
        String rawChannel,
        String ipAddress,
        String userAgent
    ) {
        User user = loadActiveUser(rawUserId);
        OtpChallengePurpose purpose = parsePurpose(rawPurpose);
        OtpChallengeChannel channel = parseChannel(rawChannel);
        String destination = resolveDestination(user, channel);
        LocalDateTime now = LocalDateTime.now();

        AuthOtpChallenge activeChallenge = authOtpChallengeRepository
            .findFirstByUser_IdAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(user.getId(), purpose)
            .orElse(null);

        if (activeChallenge != null && activeChallenge.getExpiresAt().isBefore(now)) {
            activeChallenge.setConsumedAt(now);
            authOtpChallengeRepository.save(activeChallenge);
            activeChallenge = null;
        }

        if (activeChallenge != null) {
            LocalDateTime availableAt = activeChallenge.getCreatedAt().plusSeconds(cooldownSeconds);
            if (availableAt.isAfter(now)) {
                return new OtpChallengeSendResponse(
                    activeChallenge.getId(),
                    activeChallenge.getExpiresAt(),
                    maskDestination(channel, destination)
                );
            }
            activeChallenge.setConsumedAt(now);
            authOtpChallengeRepository.save(activeChallenge);
        }

        authOtpChallengeRepository.consumeActiveChallengesByUserIdAndPurpose(user.getId(), purpose, now);

        String rawCode = generateCode();
        AuthOtpChallenge challenge = new AuthOtpChallenge();
        challenge.setUser(user);
        challenge.setSessionId(currentSessionId);
        challenge.setPurpose(purpose);
        challenge.setChannel(channel);
        challenge.setCodeHash(hashCode(rawCode));
        challenge.setExpiresAt(now.plusMinutes(ttlMinutes));
        challenge.setAttemptCount(0);
        challenge.setMaxAttempts(maxAttempts);
        AuthOtpChallenge savedChallenge = authOtpChallengeRepository.save(challenge);

        otpChallengeNotificationSender.sendChallenge(
            new OtpChallengeNotificationSender.OtpChallengeNotification(user, purpose, channel, destination, rawCode)
        );
        authAuditService.log(
            AuthAuditEventType.OTP_CHALLENGE_SENT,
            AuthAuditStatus.SUCCESS,
            user.getId(),
            currentSessionId,
            ipAddress,
            userAgent,
            Map.of(
                "purpose", purpose.name(),
                "channel", channel.name(),
                "challengeId", savedChallenge.getId()
            )
        );

        return new OtpChallengeSendResponse(
            savedChallenge.getId(),
            savedChallenge.getExpiresAt(),
            maskDestination(channel, destination)
        );
    }

    @Transactional(noRollbackFor = AuthApiException.class)
    public void verifyChallenge(
        String rawUserId,
        String currentSessionId,
        String rawChallengeId,
        String rawCode,
        OtpChallengePurpose expectedPurpose,
        String ipAddress,
        String userAgent
    ) {
        User user = loadActiveUser(rawUserId);
        String challengeId = normalizeChallengeId(rawChallengeId);
        String normalizedCode = normalizeSubmittedCode(rawCode);
        LocalDateTime now = LocalDateTime.now();

        AuthOtpChallenge challenge = authOtpChallengeRepository.findByIdAndUser_Id(challengeId, user.getId())
            .orElseThrow(() -> auditFailure(
                user,
                currentSessionId,
                ipAddress,
                userAgent,
                HttpStatus.BAD_REQUEST,
                "CHALLENGE_INVALID",
                "Challenge inválido."
            ));

        if (expectedPurpose != null && challenge.getPurpose() != expectedPurpose) {
            throw auditFailure(user, currentSessionId, ipAddress, userAgent, HttpStatus.BAD_REQUEST, "CHALLENGE_INVALID", "Challenge inválido.");
        }
        if (challenge.getSessionId() != null && !challenge.getSessionId().isBlank()
            && (currentSessionId == null || !challenge.getSessionId().equals(currentSessionId))) {
            throw auditFailure(user, currentSessionId, ipAddress, userAgent, HttpStatus.BAD_REQUEST, "CHALLENGE_INVALID", "Challenge inválido.");
        }

        if (challenge.getConsumedAt() != null) {
            if (hasAttemptsExceeded(challenge)) {
                throw auditFailure(user, currentSessionId, ipAddress, userAgent, HttpStatus.BAD_REQUEST, "ATTEMPTS_EXCEEDED", "Superaste la cantidad máxima de intentos. Solicitá un nuevo código.");
            }
            if (challenge.getExpiresAt().isBefore(now)) {
                throw auditFailure(user, currentSessionId, ipAddress, userAgent, HttpStatus.BAD_REQUEST, "CHALLENGE_EXPIRED", "Challenge expirado.");
            }
            throw auditFailure(user, currentSessionId, ipAddress, userAgent, HttpStatus.BAD_REQUEST, "CHALLENGE_INVALID", "Challenge inválido.");
        }

        if (challenge.getExpiresAt().isBefore(now)) {
            challenge.setConsumedAt(now);
            authOtpChallengeRepository.save(challenge);
            throw auditFailure(user, currentSessionId, ipAddress, userAgent, HttpStatus.BAD_REQUEST, "CHALLENGE_EXPIRED", "Challenge expirado.");
        }
        if (hasAttemptsExceeded(challenge)) {
            challenge.setConsumedAt(now);
            authOtpChallengeRepository.save(challenge);
            throw auditFailure(user, currentSessionId, ipAddress, userAgent, HttpStatus.BAD_REQUEST, "ATTEMPTS_EXCEEDED", "Superaste la cantidad máxima de intentos. Solicitá un nuevo código.");
        }

        if (!hashCode(normalizedCode).equals(challenge.getCodeHash())) {
            int nextAttemptCount = (challenge.getAttemptCount() == null ? 0 : challenge.getAttemptCount()) + 1;
            challenge.setAttemptCount(nextAttemptCount);
            int configuredMaxAttempts = resolveMaxAttempts(challenge);
            if (nextAttemptCount >= configuredMaxAttempts) {
                challenge.setConsumedAt(now);
                authOtpChallengeRepository.save(challenge);
                throw auditFailure(user, currentSessionId, ipAddress, userAgent, HttpStatus.BAD_REQUEST, "ATTEMPTS_EXCEEDED", "Superaste la cantidad máxima de intentos. Solicitá un nuevo código.");
            }
            authOtpChallengeRepository.save(challenge);
            throw auditFailure(user, currentSessionId, ipAddress, userAgent, HttpStatus.BAD_REQUEST, "CHALLENGE_INVALID", "Challenge inválido.");
        }

        challenge.setConsumedAt(now);
        authOtpChallengeRepository.save(challenge);
        authAuditService.log(
            AuthAuditEventType.OTP_CHALLENGE_VERIFIED,
            AuthAuditStatus.SUCCESS,
            user.getId(),
            currentSessionId,
            ipAddress,
            userAgent,
            Map.of(
                "purpose", challenge.getPurpose().name(),
                "channel", challenge.getChannel().name(),
                "challengeId", challenge.getId()
            )
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

    private OtpChallengePurpose parsePurpose(String rawPurpose) {
        if (rawPurpose == null || rawPurpose.isBlank()) {
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "PURPOSE_INVALID", "Purpose inválido.");
        }
        try {
            return OtpChallengePurpose.valueOf(rawPurpose.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "PURPOSE_INVALID", "Purpose inválido.");
        }
    }

    private OtpChallengeChannel parseChannel(String rawChannel) {
        if (rawChannel == null || rawChannel.isBlank()) {
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "CHANNEL_INVALID", "Canal inválido.");
        }
        try {
            return OtpChallengeChannel.valueOf(rawChannel.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "CHANNEL_INVALID", "Canal inválido.");
        }
    }

    private String resolveDestination(User user, OtpChallengeChannel channel) {
        if (channel == OtpChallengeChannel.EMAIL) {
            if (user.getEmail() == null || user.getEmail().isBlank()) {
                throw new AuthApiException(HttpStatus.BAD_REQUEST, "EMAIL_MISSING", "Tu cuenta no tiene email disponible.");
            }
            return user.getEmail().trim().toLowerCase(Locale.ROOT);
        }
        if (user.getPhoneNumber() == null || user.getPhoneNumber().isBlank()) {
            throw new AuthApiException(
                HttpStatus.BAD_REQUEST,
                "PHONE_MISSING",
                "Tu cuenta no tiene teléfono disponible."
            );
        }
        return user.getPhoneNumber().trim();
    }

    private String generateCode() {
        int value = SECURE_RANDOM.nextInt(900000) + 100000;
        return String.valueOf(value);
    }

    private String hashCode(String rawCode) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest((rawCode + otpChallengePepper).getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte current : hash) {
                hex.append(String.format("%02x", current));
            }
            return hex.toString();
        } catch (Exception exception) {
            throw new IllegalStateException("No se pudo hashear el código OTP", exception);
        }
    }

    private String normalizeChallengeId(String rawChallengeId) {
        if (rawChallengeId == null || rawChallengeId.isBlank()) {
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "CHALLENGE_INVALID", "Challenge inválido.");
        }
        return rawChallengeId.trim();
    }

    private String normalizeSubmittedCode(String rawCode) {
        if (rawCode == null) {
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "CHALLENGE_INVALID", "Challenge inválido.");
        }
        String trimmed = rawCode.trim();
        if (trimmed.length() != 6 || !trimmed.chars().allMatch(Character::isDigit)) {
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "CHALLENGE_INVALID", "Challenge inválido.");
        }
        return trimmed;
    }

    private boolean hasAttemptsExceeded(AuthOtpChallenge challenge) {
        return (challenge.getAttemptCount() == null ? 0 : challenge.getAttemptCount()) >= resolveMaxAttempts(challenge);
    }

    private int resolveMaxAttempts(AuthOtpChallenge challenge) {
        if (challenge.getMaxAttempts() == null || challenge.getMaxAttempts() <= 0) {
            return maxAttempts;
        }
        return challenge.getMaxAttempts();
    }

    private String maskDestination(OtpChallengeChannel channel, String destination) {
        if (channel == OtpChallengeChannel.EMAIL) {
            int atIndex = destination.indexOf('@');
            if (atIndex <= 1) {
                return "***" + destination.substring(Math.max(atIndex, 0));
            }
            return destination.substring(0, 1) + "***" + destination.substring(atIndex);
        }
        StringBuilder digits = new StringBuilder();
        for (int index = 0; index < destination.length(); index += 1) {
            char current = destination.charAt(index);
            if (Character.isDigit(current)) {
                digits.append(current);
            }
        }
        String normalized = digits.length() > 0 ? digits.toString() : destination;
        int visibleDigits = Math.min(2, normalized.length());
        return "***" + normalized.substring(normalized.length() - visibleDigits);
    }

    private AuthApiException auditFailure(
        User user,
        String currentSessionId,
        String ipAddress,
        String userAgent,
        HttpStatus status,
        String code,
        String message
    ) {
        authAuditService.log(
            AuthAuditEventType.CHALLENGE_FAILURE,
            AuthAuditStatus.FAILURE,
            user.getId(),
            currentSessionId,
            ipAddress,
            userAgent,
            Map.of("reason", code)
        );
        return new AuthApiException(status, code, message);
    }
}
