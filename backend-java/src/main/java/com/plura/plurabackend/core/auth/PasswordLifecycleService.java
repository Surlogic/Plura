package com.plura.plurabackend.core.auth;

import com.plura.plurabackend.core.auth.dto.PasswordRecoveryVerifyPhoneResponse;
import com.plura.plurabackend.core.auth.model.AuthAuditEventType;
import com.plura.plurabackend.core.auth.model.AuthAuditStatus;
import com.plura.plurabackend.core.auth.model.AuthOtpChallenge;
import com.plura.plurabackend.core.auth.model.OtpChallengeChannel;
import com.plura.plurabackend.core.auth.model.OtpChallengePurpose;
import com.plura.plurabackend.core.auth.model.PasswordResetToken;
import com.plura.plurabackend.core.auth.repository.AuthOtpChallengeRepository;
import com.plura.plurabackend.core.auth.repository.PasswordResetTokenRepository;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PasswordLifecycleService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String RESET_REASON = "PASSWORD_RESET";
    private static final String CHANGE_REASON = "PASSWORD_CHANGE";

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicyService passwordPolicyService;
    private final SessionService sessionService;
    private final PasswordResetNotificationSender passwordResetNotificationSender;
    private final OtpChallengeNotificationSender otpChallengeNotificationSender;
    private final AuthOtpChallengeRepository authOtpChallengeRepository;
    private final AuthAuditService authAuditService;
    private final String resetTokenPepper;
    private final long passwordResetTtlMinutes;
    private final String passwordResetPublicBaseUrl;
    private final long passwordRecoveryOtpTtlMinutes;
    private final int passwordRecoveryOtpMaxAttempts;

    public PasswordLifecycleService(
        UserRepository userRepository,
        PasswordResetTokenRepository passwordResetTokenRepository,
        PasswordEncoder passwordEncoder,
        PasswordPolicyService passwordPolicyService,
        SessionService sessionService,
        PasswordResetNotificationSender passwordResetNotificationSender,
        OtpChallengeNotificationSender otpChallengeNotificationSender,
        AuthOtpChallengeRepository authOtpChallengeRepository,
        AuthAuditService authAuditService,
        @Value("${app.auth.password-reset.pepper:${jwt.refresh-pepper}}") String resetTokenPepper,
        @Value("${app.auth.password-reset.ttl-minutes:30}") long passwordResetTtlMinutes,
        @Value("${app.auth.password-reset.public-base-url:http://localhost:3002}") String passwordResetPublicBaseUrl,
        @Value("${app.auth.otp-challenge.ttl-minutes:10}") long passwordRecoveryOtpTtlMinutes,
        @Value("${app.auth.otp-challenge.max-attempts:5}") int passwordRecoveryOtpMaxAttempts
    ) {
        this.userRepository = userRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.passwordPolicyService = passwordPolicyService;
        this.sessionService = sessionService;
        this.passwordResetNotificationSender = passwordResetNotificationSender;
        this.otpChallengeNotificationSender = otpChallengeNotificationSender;
        this.authOtpChallengeRepository = authOtpChallengeRepository;
        this.authAuditService = authAuditService;
        this.resetTokenPepper = resetTokenPepper;
        this.passwordResetTtlMinutes = passwordResetTtlMinutes;
        this.passwordResetPublicBaseUrl = passwordResetPublicBaseUrl;
        this.passwordRecoveryOtpTtlMinutes = passwordRecoveryOtpTtlMinutes;
        this.passwordRecoveryOtpMaxAttempts = passwordRecoveryOtpMaxAttempts;
    }

    @Transactional
    public void changePassword(String rawUserId, String currentPassword, String newPassword) {
        User user = loadActiveUser(rawUserId);
        if (currentPassword == null || currentPassword.isBlank()) {
            throw new AuthApiException(
                HttpStatus.UNAUTHORIZED,
                "CURRENT_PASSWORD_INVALID",
                "La contraseña actual no es correcta."
            );
        }
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new AuthApiException(
                HttpStatus.UNAUTHORIZED,
                "CURRENT_PASSWORD_INVALID",
                "La contraseña actual no es correcta."
            );
        }
        passwordPolicyService.validateNewPassword(newPassword);
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordChangedAt(LocalDateTime.now());
        userRepository.save(user);
        passwordResetTokenRepository.consumeActiveTokensByUserId(user.getId(), LocalDateTime.now());
        sessionService.invalidateAllSessionsForUser(user.getId(), CHANGE_REASON);
        authAuditService.log(
            AuthAuditEventType.PASSWORD_CHANGED,
            AuthAuditStatus.SUCCESS,
            user.getId(),
            null,
            null,
            null,
            null
        );
    }

    @Transactional
    public void startPasswordRecovery(String email, String ipAddress, String userAgent) {
        String normalizedEmail = normalizeEmail(email);
        if (normalizedEmail == null) {
            return;
        }
        authAuditService.log(
            AuthAuditEventType.PASSWORD_RESET_REQUESTED,
            AuthAuditStatus.SUCCESS,
            null,
            null,
            normalizeIp(ipAddress),
            normalizeUserAgent(userAgent),
            Map.of("email", normalizedEmail, "mode", "recovery_start")
        );
    }

    @Transactional
    public PasswordRecoveryVerifyPhoneResponse verifyRecoveryPhoneAndSendCode(
        String email,
        String phoneNumber,
        String ipAddress,
        String userAgent
    ) {
        User user = loadEligibleRecoveryUser(email, phoneNumber);
        LocalDateTime now = LocalDateTime.now();

        authOtpChallengeRepository.consumeActiveChallengesByUserIdAndPurpose(
            user.getId(),
            OtpChallengePurpose.PASSWORD_RECOVERY,
            now
        );

        String rawCode = generateNumericCode();
        AuthOtpChallenge challenge = new AuthOtpChallenge();
        challenge.setUser(user);
        challenge.setSessionId(null);
        challenge.setPurpose(OtpChallengePurpose.PASSWORD_RECOVERY);
        challenge.setChannel(OtpChallengeChannel.EMAIL);
        challenge.setCodeHash(hashToken(rawCode));
        challenge.setExpiresAt(now.plusMinutes(passwordRecoveryOtpTtlMinutes));
        challenge.setAttemptCount(0);
        challenge.setMaxAttempts(passwordRecoveryOtpMaxAttempts);
        AuthOtpChallenge savedChallenge = authOtpChallengeRepository.save(challenge);

        otpChallengeNotificationSender.sendChallenge(
            new OtpChallengeNotificationSender.OtpChallengeNotification(
                user,
                OtpChallengePurpose.PASSWORD_RECOVERY,
                OtpChallengeChannel.EMAIL,
                user.getEmail(),
                rawCode
            )
        );

        authAuditService.log(
            AuthAuditEventType.OTP_CHALLENGE_SENT,
            AuthAuditStatus.SUCCESS,
            user.getId(),
            null,
            normalizeIp(ipAddress),
            normalizeUserAgent(userAgent),
            Map.of("purpose", OtpChallengePurpose.PASSWORD_RECOVERY.name(), "challengeId", savedChallenge.getId())
        );

        return new PasswordRecoveryVerifyPhoneResponse(
            savedChallenge.getId(),
            savedChallenge.getExpiresAt(),
            maskEmail(user.getEmail())
        );
    }

    @Transactional
    public void confirmPasswordRecovery(
        String email,
        String phoneNumber,
        String challengeId,
        String code,
        String newPassword,
        String confirmPassword,
        String ipAddress,
        String userAgent
    ) {
        User user = loadEligibleRecoveryUser(email, phoneNumber);

        if (newPassword == null || !newPassword.equals(confirmPassword)) {
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "PASSWORD_CONFIRMATION_INVALID", "Las contraseñas no coinciden.");
        }
        passwordPolicyService.validateNewPassword(newPassword);

        AuthOtpChallenge challenge = authOtpChallengeRepository.findByIdAndUser_Id(
            normalizeChallengeId(challengeId),
            user.getId()
        ).orElseThrow(() -> new AuthApiException(HttpStatus.BAD_REQUEST, "CHALLENGE_INVALID", "Código inválido."));

        LocalDateTime now = LocalDateTime.now();
        if (challenge.getPurpose() != OtpChallengePurpose.PASSWORD_RECOVERY || challenge.getChannel() != OtpChallengeChannel.EMAIL) {
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "CHALLENGE_INVALID", "Código inválido.");
        }
        if (challenge.getConsumedAt() != null) {
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "CHALLENGE_INVALID", "Código inválido.");
        }
        if (challenge.getExpiresAt().isBefore(now)) {
            challenge.setConsumedAt(now);
            authOtpChallengeRepository.save(challenge);
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "CHALLENGE_EXPIRED", "Código expirado.");
        }
        int maxAttempts = challenge.getMaxAttempts() == null || challenge.getMaxAttempts() < 1
            ? passwordRecoveryOtpMaxAttempts
            : challenge.getMaxAttempts();
        int currentAttempts = challenge.getAttemptCount() == null ? 0 : challenge.getAttemptCount();
        if (currentAttempts >= maxAttempts) {
            challenge.setConsumedAt(now);
            authOtpChallengeRepository.save(challenge);
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "ATTEMPTS_EXCEEDED", "Superaste la cantidad máxima de intentos. Solicitá un nuevo código.");
        }
        if (!hashToken(normalizeSubmittedCode(code)).equals(challenge.getCodeHash())) {
            int nextAttempts = currentAttempts + 1;
            challenge.setAttemptCount(nextAttempts);
            if (nextAttempts >= maxAttempts) {
                challenge.setConsumedAt(now);
            }
            authOtpChallengeRepository.save(challenge);
            throw new AuthApiException(HttpStatus.BAD_REQUEST, nextAttempts >= maxAttempts ? "ATTEMPTS_EXCEEDED" : "CHALLENGE_INVALID", nextAttempts >= maxAttempts ? "Superaste la cantidad máxima de intentos. Solicitá un nuevo código." : "Código inválido.");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordChangedAt(now);
        userRepository.save(user);

        challenge.setConsumedAt(now);
        authOtpChallengeRepository.save(challenge);
        authOtpChallengeRepository.consumeActiveChallengesByUserIdAndPurpose(user.getId(), OtpChallengePurpose.PASSWORD_RECOVERY, now);
        passwordResetTokenRepository.consumeActiveTokensByUserId(user.getId(), now);
        sessionService.invalidateAllSessionsForUser(user.getId(), RESET_REASON);
        authAuditService.log(
            AuthAuditEventType.PASSWORD_RESET_COMPLETED,
            AuthAuditStatus.SUCCESS,
            user.getId(),
            null,
            normalizeIp(ipAddress),
            normalizeUserAgent(userAgent),
            Map.of("email", user.getEmail(), "mode", "recovery_code")
        );
    }

    @Transactional
    public void requestPasswordReset(String email, String ipAddress, String userAgent) {
        String normalizedEmail = normalizeEmail(email);
        if (normalizedEmail == null) {
            return;
        }

        User user = userRepository.findByEmailAndDeletedAtIsNull(normalizedEmail).orElse(null);
        if (user == null || !isEligibleForPasswordReset(user)) {
            return;
        }

        passwordResetTokenRepository.consumeActiveTokensByUserId(user.getId(), LocalDateTime.now());
        String rawToken = generateResetToken();
        PasswordResetToken token = new PasswordResetToken();
        token.setUser(user);
        token.setTokenHash(hashToken(rawToken));
        token.setExpiresAt(LocalDateTime.now().plusMinutes(passwordResetTtlMinutes));
        token.setRequestedIp(normalizeIp(ipAddress));
        token.setRequestUserAgent(normalizeUserAgent(userAgent));
        PasswordResetToken saved = passwordResetTokenRepository.save(token);
        passwordResetNotificationSender.sendPasswordReset(
            new PasswordResetNotificationSender.PasswordResetNotification(
                user,
                buildResetUrl(rawToken),
                rawToken
            )
        );
        authAuditService.log(
            AuthAuditEventType.PASSWORD_RESET_REQUESTED,
            AuthAuditStatus.SUCCESS,
            user.getId(),
            null,
            normalizeIp(ipAddress),
            normalizeUserAgent(userAgent),
            Map.of("email", normalizedEmail)
        );
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        String normalizedToken = normalizeSubmittedToken(rawToken);
        passwordPolicyService.validateNewPassword(newPassword);
        PasswordResetToken resetToken = passwordResetTokenRepository.findByTokenHash(hashToken(normalizedToken))
            .orElseThrow(() -> new AuthApiException(HttpStatus.BAD_REQUEST, "TOKEN_INVALID", "Token inválido."));

        if (resetToken.getConsumedAt() != null) {
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "TOKEN_INVALID", "Token inválido.");
        }
        if (resetToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            resetToken.setConsumedAt(LocalDateTime.now());
            passwordResetTokenRepository.save(resetToken);
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "TOKEN_EXPIRED", "Token expirado.");
        }

        User user = resetToken.getUser();
        if (user == null || user.getDeletedAt() != null) {
            resetToken.setConsumedAt(LocalDateTime.now());
            passwordResetTokenRepository.save(resetToken);
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "TOKEN_INVALID", "Token inválido.");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordChangedAt(LocalDateTime.now());
        userRepository.save(user);

        LocalDateTime now = LocalDateTime.now();
        resetToken.setConsumedAt(now);
        passwordResetTokenRepository.save(resetToken);
        passwordResetTokenRepository.consumeActiveTokensByUserId(user.getId(), now);
        sessionService.invalidateAllSessionsForUser(user.getId(), RESET_REASON);
        authAuditService.log(
            AuthAuditEventType.PASSWORD_RESET_COMPLETED,
            AuthAuditStatus.SUCCESS,
            user.getId(),
            null,
            null,
            null,
            Map.of("email", user.getEmail())
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

    private boolean isEligibleForPasswordReset(User user) {
        if (user.getPassword() == null || user.getPassword().isBlank()) {
            return false;
        }
        return user.getProvider() == null || user.getPasswordChangedAt() != null;
    }

    private boolean isEligibleForPasswordRecovery(User user) {
        return user != null
            && user.getDeletedAt() == null
            && user.getEmail() != null
            && !user.getEmail().isBlank()
            && user.getPhoneNumber() != null
            && !user.getPhoneNumber().isBlank();
    }

    private String buildResetUrl(String rawToken) {
        String trimmedBaseUrl = passwordResetPublicBaseUrl == null ? "" : passwordResetPublicBaseUrl.trim();
        String sanitizedBaseUrl = trimmedBaseUrl.endsWith("/")
            ? trimmedBaseUrl.substring(0, trimmedBaseUrl.length() - 1)
            : trimmedBaseUrl;
        return sanitizedBaseUrl + "/auth/reset-password?token=" + rawToken;
    }

    private String generateResetToken() {
        byte[] randomBytes = new byte[48];
        SECURE_RANDOM.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String value = rawToken + resetTokenPepper;
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception exception) {
            throw new IllegalStateException("No se pudo hashear el token de reset", exception);
        }
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        String trimmed = email.trim().toLowerCase(Locale.ROOT);
        return trimmed.isBlank() ? null : trimmed;
    }

    private String normalizeIp(String ipAddress) {
        if (ipAddress == null) {
            return null;
        }
        String trimmed = ipAddress.trim();
        if (trimmed.isBlank()) {
            return null;
        }
        return trimmed.length() <= 64 ? trimmed : trimmed.substring(0, 64);
    }

    private String normalizeUserAgent(String userAgent) {
        if (userAgent == null) {
            return null;
        }
        String trimmed = userAgent.trim();
        if (trimmed.isBlank()) {
            return null;
        }
        return trimmed.length() <= 500 ? trimmed : trimmed.substring(0, 500);
    }

    private User loadEligibleRecoveryUser(String email, String phoneNumber) {
        String normalizedEmail = normalizeEmail(email);
        String normalizedPhone = normalizePhone(phoneNumber);
        if (normalizedEmail == null || normalizedPhone == null) {
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "RECOVERY_DATA_INVALID", "No pudimos validar el email y el teléfono.");
        }

        User user = userRepository.findByEmailAndDeletedAtIsNull(normalizedEmail)
            .orElseThrow(() -> new AuthApiException(HttpStatus.BAD_REQUEST, "RECOVERY_DATA_INVALID", "No pudimos validar el email y el teléfono."));

        if (!isEligibleForPasswordRecovery(user)) {
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "RECOVERY_DATA_INVALID", "No pudimos validar el email y el teléfono.");
        }

        String storedPhone = normalizePhone(user.getPhoneNumber());
        if (storedPhone == null || !storedPhone.equals(normalizedPhone)) {
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "RECOVERY_DATA_INVALID", "No pudimos validar el email y el teléfono.");
        }
        return user;
    }

    private String normalizePhone(String phoneNumber) {
        if (phoneNumber == null) {
            return null;
        }
        String trimmed = phoneNumber.trim();
        if (trimmed.isBlank()) {
            return null;
        }
        String collapsed = trimmed
            .replace(" ", "")
            .replace("-", "")
            .replace("(", "")
            .replace(")", "");
        if (collapsed.startsWith("+")) {
            String digits = collapsed.substring(1).replaceAll("\\D", "");
            return digits.length() >= 8 && digits.length() <= 20 ? "+" + digits : null;
        }
        String digits = collapsed.replaceAll("\\D", "");
        return digits.length() >= 8 && digits.length() <= 20 ? digits : null;
    }

    private String normalizeChallengeId(String rawChallengeId) {
        if (rawChallengeId == null) {
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "CHALLENGE_INVALID", "Código inválido.");
        }
        String trimmed = rawChallengeId.trim();
        if (trimmed.isBlank()) {
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "CHALLENGE_INVALID", "Código inválido.");
        }
        return trimmed;
    }

    private String normalizeSubmittedCode(String rawCode) {
        if (rawCode == null) {
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "CHALLENGE_INVALID", "Código inválido.");
        }
        String digits = rawCode.replaceAll("\\D", "");
        if (digits.isBlank()) {
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "CHALLENGE_INVALID", "Código inválido.");
        }
        return digits;
    }

    private String generateNumericCode() {
        int value = SECURE_RANDOM.nextInt(900000) + 100000;
        return String.valueOf(value);
    }

    private String maskEmail(String email) {
        if (email == null || email.isBlank()) {
            return "correo desconocido";
        }
        int atIndex = email.indexOf('@');
        if (atIndex <= 1) {
            return "***" + email.substring(Math.max(atIndex, 0));
        }
        return email.substring(0, 1) + "***" + email.substring(atIndex);
    }

    private String normalizeSubmittedToken(String rawToken) {
        if (rawToken == null) {
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "TOKEN_INVALID", "Token inválido.");
        }
        String trimmed = rawToken.trim();
        if (trimmed.isBlank()) {
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "TOKEN_INVALID", "Token inválido.");
        }
        return trimmed;
    }
}
