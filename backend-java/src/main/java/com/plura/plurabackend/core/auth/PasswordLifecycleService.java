package com.plura.plurabackend.core.auth;

import com.plura.plurabackend.core.auth.model.PasswordResetToken;
import com.plura.plurabackend.core.auth.model.AuthAuditEventType;
import com.plura.plurabackend.core.auth.model.AuthAuditStatus;
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
    private final AuthAuditService authAuditService;
    private final String resetTokenPepper;
    private final long passwordResetTtlMinutes;
    private final String passwordResetPublicBaseUrl;

    public PasswordLifecycleService(
        UserRepository userRepository,
        PasswordResetTokenRepository passwordResetTokenRepository,
        PasswordEncoder passwordEncoder,
        PasswordPolicyService passwordPolicyService,
        SessionService sessionService,
        PasswordResetNotificationSender passwordResetNotificationSender,
        AuthAuditService authAuditService,
        @Value("${app.auth.password-reset.pepper:${jwt.refresh-pepper}}") String resetTokenPepper,
        @Value("${app.auth.password-reset.ttl-minutes:30}") long passwordResetTtlMinutes,
        @Value("${app.auth.password-reset.public-base-url:http://localhost:3002}") String passwordResetPublicBaseUrl
    ) {
        this.userRepository = userRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.passwordPolicyService = passwordPolicyService;
        this.sessionService = sessionService;
        this.passwordResetNotificationSender = passwordResetNotificationSender;
        this.authAuditService = authAuditService;
        this.resetTokenPepper = resetTokenPepper;
        this.passwordResetTtlMinutes = passwordResetTtlMinutes;
        this.passwordResetPublicBaseUrl = passwordResetPublicBaseUrl;
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
