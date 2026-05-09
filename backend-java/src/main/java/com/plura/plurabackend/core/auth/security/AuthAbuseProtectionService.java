package com.plura.plurabackend.core.auth.security;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Duration;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * AuthAbuseProtectionService es un servicio de negocio del modulo autenticacion / seguridad.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: trustForwardedHeaders, loginWindowMillis, loginMaxFailures, loginBaseBlockSeconds, entre otros.
 * Foco funcional: servicios, autenticacion y sesiones.
 */
@Service
public class AuthAbuseProtectionService {

    private static final long CLEANUP_EVERY = 500;

    private final boolean trustForwardedHeaders;
    private final long loginWindowMillis;
    private final int loginMaxFailures;
    private final long loginBaseBlockSeconds;
    private final long loginMaxBlockSeconds;
    private final long registerWindowMillis;
    private final int registerMaxAttemptsPerEmail;
    private final int registerMaxAttemptsPerEmailAndIp;
    private final long passwordResetWindowMillis;
    private final int passwordResetMaxAttemptsPerEmail;
    private final int passwordResetMaxAttemptsPerEmailAndIp;
    private final long verifyEmailSendWindowMillis;
    private final int verifyEmailSendMaxPerUser;
    private final int verifyEmailSendMaxPerUserIp;
    private final long verifyEmailConfirmWindowMillis;
    private final int verifyEmailConfirmMaxPerUser;
    private final int verifyEmailConfirmMaxPerUserIp;
    private final long verifyPhoneSendWindowMillis;
    private final int verifyPhoneSendMaxPerUser;
    private final int verifyPhoneSendMaxPerUserIp;
    private final long verifyPhoneConfirmWindowMillis;
    private final int verifyPhoneConfirmMaxPerUser;
    private final int verifyPhoneConfirmMaxPerUserIp;
    private final long challengeSendWindowMillis;
    private final int challengeSendMaxPerUser;
    private final int challengeSendMaxPerUserIp;
    private final long challengeVerifyWindowMillis;
    private final int challengeVerifyMaxPerUser;
    private final int challengeVerifyMaxPerUserIp;
    private final long refreshWindowMillis;
    private final int refreshMaxPerUser;
    private final int refreshMaxPerIp;
    private final long maxCounterWindowMillis;
    private final ConcurrentHashMap<String, LoginAttemptState> loginStates = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, WindowCounter> counterStates = new ConcurrentHashMap<>();
    private final AtomicLong operationCounter = new AtomicLong(0);

    public AuthAbuseProtectionService(
        @Value("${app.security.trust-forwarded-headers:false}") boolean trustForwardedHeaders,
        @Value("${app.auth.abuse.login.window-seconds:900}") long loginWindowSeconds,
        @Value("${app.auth.abuse.login.max-failures:5}") int loginMaxFailures,
        @Value("${app.auth.abuse.login.base-block-seconds:30}") long loginBaseBlockSeconds,
        @Value("${app.auth.abuse.login.max-block-seconds:900}") long loginMaxBlockSeconds,
        @Value("${app.auth.abuse.register.window-seconds:1800}") long registerWindowSeconds,
        @Value("${app.auth.abuse.register.max-per-email:8}") int registerMaxAttemptsPerEmail,
        @Value("${app.auth.abuse.register.max-per-email-ip:5}") int registerMaxAttemptsPerEmailAndIp,
        @Value("${app.auth.abuse.password-reset.window-seconds:1800}") long passwordResetWindowSeconds,
        @Value("${app.auth.abuse.password-reset.max-per-email:6}") int passwordResetMaxAttemptsPerEmail,
        @Value("${app.auth.abuse.password-reset.max-per-email-ip:4}") int passwordResetMaxAttemptsPerEmailAndIp,
        @Value("${app.auth.abuse.verify-email-send.window-seconds:900}") long verifyEmailSendWindowSeconds,
        @Value("${app.auth.abuse.verify-email-send.max-per-user:6}") int verifyEmailSendMaxPerUser,
        @Value("${app.auth.abuse.verify-email-send.max-per-user-ip:4}") int verifyEmailSendMaxPerUserIp,
        @Value("${app.auth.abuse.verify-email-confirm.window-seconds:900}") long verifyEmailConfirmWindowSeconds,
        @Value("${app.auth.abuse.verify-email-confirm.max-per-user:10}") int verifyEmailConfirmMaxPerUser,
        @Value("${app.auth.abuse.verify-email-confirm.max-per-user-ip:6}") int verifyEmailConfirmMaxPerUserIp,
        @Value("${app.auth.abuse.verify-phone-send.window-seconds:900}") long verifyPhoneSendWindowSeconds,
        @Value("${app.auth.abuse.verify-phone-send.max-per-user:5}") int verifyPhoneSendMaxPerUser,
        @Value("${app.auth.abuse.verify-phone-send.max-per-user-ip:3}") int verifyPhoneSendMaxPerUserIp,
        @Value("${app.auth.abuse.verify-phone-confirm.window-seconds:900}") long verifyPhoneConfirmWindowSeconds,
        @Value("${app.auth.abuse.verify-phone-confirm.max-per-user:10}") int verifyPhoneConfirmMaxPerUser,
        @Value("${app.auth.abuse.verify-phone-confirm.max-per-user-ip:6}") int verifyPhoneConfirmMaxPerUserIp,
        @Value("${app.auth.abuse.challenge-send.window-seconds:900}") long challengeSendWindowSeconds,
        @Value("${app.auth.abuse.challenge-send.max-per-user:5}") int challengeSendMaxPerUser,
        @Value("${app.auth.abuse.challenge-send.max-per-user-ip:3}") int challengeSendMaxPerUserIp,
        @Value("${app.auth.abuse.challenge-verify.window-seconds:900}") long challengeVerifyWindowSeconds,
        @Value("${app.auth.abuse.challenge-verify.max-per-user:10}") int challengeVerifyMaxPerUser,
        @Value("${app.auth.abuse.challenge-verify.max-per-user-ip:6}") int challengeVerifyMaxPerUserIp,
        @Value("${app.auth.abuse.refresh.window-seconds:300}") long refreshWindowSeconds,
        @Value("${app.auth.abuse.refresh.max-per-user:30}") int refreshMaxPerUser,
        @Value("${app.auth.abuse.refresh.max-per-ip:60}") int refreshMaxPerIp
    ) {
        this.trustForwardedHeaders = trustForwardedHeaders;
        this.loginWindowMillis = positiveWindowMillis(loginWindowSeconds);
        this.loginMaxFailures = positiveInt(loginMaxFailures, 5);
        this.loginBaseBlockSeconds = positiveLong(loginBaseBlockSeconds, 30);
        this.loginMaxBlockSeconds = positiveLong(loginMaxBlockSeconds, 900);
        this.registerWindowMillis = positiveWindowMillis(registerWindowSeconds);
        this.registerMaxAttemptsPerEmail = positiveInt(registerMaxAttemptsPerEmail, 8);
        this.registerMaxAttemptsPerEmailAndIp = positiveInt(registerMaxAttemptsPerEmailAndIp, 5);
        this.passwordResetWindowMillis = positiveWindowMillis(passwordResetWindowSeconds);
        this.passwordResetMaxAttemptsPerEmail = positiveInt(passwordResetMaxAttemptsPerEmail, 6);
        this.passwordResetMaxAttemptsPerEmailAndIp = positiveInt(passwordResetMaxAttemptsPerEmailAndIp, 4);
        this.verifyEmailSendWindowMillis = positiveWindowMillis(verifyEmailSendWindowSeconds);
        this.verifyEmailSendMaxPerUser = positiveInt(verifyEmailSendMaxPerUser, 6);
        this.verifyEmailSendMaxPerUserIp = positiveInt(verifyEmailSendMaxPerUserIp, 4);
        this.verifyEmailConfirmWindowMillis = positiveWindowMillis(verifyEmailConfirmWindowSeconds);
        this.verifyEmailConfirmMaxPerUser = positiveInt(verifyEmailConfirmMaxPerUser, 10);
        this.verifyEmailConfirmMaxPerUserIp = positiveInt(verifyEmailConfirmMaxPerUserIp, 6);
        this.verifyPhoneSendWindowMillis = positiveWindowMillis(verifyPhoneSendWindowSeconds);
        this.verifyPhoneSendMaxPerUser = positiveInt(verifyPhoneSendMaxPerUser, 5);
        this.verifyPhoneSendMaxPerUserIp = positiveInt(verifyPhoneSendMaxPerUserIp, 3);
        this.verifyPhoneConfirmWindowMillis = positiveWindowMillis(verifyPhoneConfirmWindowSeconds);
        this.verifyPhoneConfirmMaxPerUser = positiveInt(verifyPhoneConfirmMaxPerUser, 10);
        this.verifyPhoneConfirmMaxPerUserIp = positiveInt(verifyPhoneConfirmMaxPerUserIp, 6);
        this.challengeSendWindowMillis = positiveWindowMillis(challengeSendWindowSeconds);
        this.challengeSendMaxPerUser = positiveInt(challengeSendMaxPerUser, 5);
        this.challengeSendMaxPerUserIp = positiveInt(challengeSendMaxPerUserIp, 3);
        this.challengeVerifyWindowMillis = positiveWindowMillis(challengeVerifyWindowSeconds);
        this.challengeVerifyMaxPerUser = positiveInt(challengeVerifyMaxPerUser, 10);
        this.challengeVerifyMaxPerUserIp = positiveInt(challengeVerifyMaxPerUserIp, 6);
        this.refreshWindowMillis = positiveWindowMillis(refreshWindowSeconds);
        this.refreshMaxPerUser = positiveInt(refreshMaxPerUser, 30);
        this.refreshMaxPerIp = positiveInt(refreshMaxPerIp, 60);
        this.maxCounterWindowMillis = Math.max(
            registerWindowMillis,
            Math.max(
                passwordResetWindowMillis,
                Math.max(
                    verifyEmailSendWindowMillis,
                    Math.max(
                        verifyEmailConfirmWindowMillis,
                        Math.max(
                            verifyPhoneSendWindowMillis,
                            Math.max(
                                verifyPhoneConfirmWindowMillis,
                                Math.max(challengeSendWindowMillis, Math.max(challengeVerifyWindowMillis, refreshWindowMillis))
                            )
                        )
                    )
                )
            )
        );
    }

    // --- Login ---

    /**
     * Fuerza la regla login allowed antes de permitir que continue el flujo.
     * Esta separacion hace explicita la regla de seguridad o negocio que protege el flujo.
     */
    public void enforceLoginAllowed(String email, HttpServletRequest request) {
        String normalizedEmail = normalizeEmail(email);
        String ip = extractClientIp(request);
        long now = System.currentTimeMillis();

        long blockedUntil = Math.max(
            blockedUntil("login:acct:" + normalizedEmail, now),
            blockedUntil("login:acctip:" + normalizedEmail + ":" + ip, now)
        );
        maybeCleanup(now);

        if (blockedUntil > now) {
            long retryAfterSeconds = Math.max(1, (blockedUntil - now + 999) / 1000);
            throw new ResponseStatusException(
                HttpStatus.TOO_MANY_REQUESTS,
                "Demasiados intentos de login. Reintentá en " + retryAfterSeconds + "s"
            );
        }
    }

    /**
     * Registra login failure para auditoria, historial o notificaciones.
     */
    public void recordLoginFailure(String email, HttpServletRequest request) {
        String normalizedEmail = normalizeEmail(email);
        String ip = extractClientIp(request);
        long now = System.currentTimeMillis();
        increaseFailure("login:acct:" + normalizedEmail, now);
        increaseFailure("login:acctip:" + normalizedEmail + ":" + ip, now);
        maybeCleanup(now);
    }

    /**
     * Registra login success para auditoria, historial o notificaciones.
     */
    public void recordLoginSuccess(String email, HttpServletRequest request) {
        String normalizedEmail = normalizeEmail(email);
        String ip = extractClientIp(request);
        loginStates.remove("login:acct:" + normalizedEmail);
        loginStates.remove("login:acctip:" + normalizedEmail + ":" + ip);
    }

    // --- Registration ---

    /**
     * Fuerza la regla registration allowed antes de permitir que continue el flujo.
     * Esta separacion hace explicita la regla de seguridad o negocio que protege el flujo.
     */
    public void enforceRegistrationAllowed(String email, HttpServletRequest request) {
        String normalizedEmail = normalizeEmail(email);
        String ip = extractClientIp(request);
        long now = System.currentTimeMillis();

        checkWindowCounter(
            "register:email:" + normalizedEmail,
            registerMaxAttemptsPerEmail,
            registerWindowMillis,
            "Demasiados intentos de registro. Reintentá más tarde",
            now
        );
        checkWindowCounter(
            "register:emailip:" + normalizedEmail + ":" + ip,
            registerMaxAttemptsPerEmailAndIp,
            registerWindowMillis,
            "Demasiados intentos de registro. Reintentá más tarde",
            now
        );
        maybeCleanup(now);
    }

    // --- Password Reset ---

    /**
     * Fuerza la regla contrasena reset allowed antes de permitir que continue el flujo.
     * Esta separacion hace explicita la regla de seguridad o negocio que protege el flujo.
     */
    public void enforcePasswordResetAllowed(String email, HttpServletRequest request) {
        String normalizedEmail = normalizeEmail(email);
        String ip = extractClientIp(request);
        long now = System.currentTimeMillis();

        checkWindowCounter(
            "pwd-reset:email:" + normalizedEmail,
            passwordResetMaxAttemptsPerEmail,
            passwordResetWindowMillis,
            "Demasiados intentos de recuperación. Reintentá más tarde",
            now
        );
        checkWindowCounter(
            "pwd-reset:emailip:" + normalizedEmail + ":" + ip,
            passwordResetMaxAttemptsPerEmailAndIp,
            passwordResetWindowMillis,
            "Demasiados intentos de recuperación. Reintentá más tarde",
            now
        );
        maybeCleanup(now);
    }

    // --- Email Verification Send ---

    /**
     * Fuerza la regla email verification send allowed antes de permitir que continue el flujo.
     * Esta separacion hace explicita la regla de seguridad o negocio que protege el flujo.
     */
    public void enforceEmailVerificationSendAllowed(String userId, HttpServletRequest request) {
        String ip = extractClientIp(request);
        long now = System.currentTimeMillis();

        checkWindowCounter(
            "verify-email-send:user:" + userId,
            verifyEmailSendMaxPerUser,
            verifyEmailSendWindowMillis,
            "Demasiados envíos de verificación de email. Reintentá más tarde",
            now
        );
        checkWindowCounter(
            "verify-email-send:userip:" + userId + ":" + ip,
            verifyEmailSendMaxPerUserIp,
            verifyEmailSendWindowMillis,
            "Demasiados envíos de verificación de email. Reintentá más tarde",
            now
        );
        maybeCleanup(now);
    }

    // --- Email Verification Confirm ---

    /**
     * Fuerza la regla email verification confirm allowed antes de permitir que continue el flujo.
     * Esta separacion hace explicita la regla de seguridad o negocio que protege el flujo.
     */
    public void enforceEmailVerificationConfirmAllowed(String userId, HttpServletRequest request) {
        String ip = extractClientIp(request);
        long now = System.currentTimeMillis();

        checkWindowCounter(
            "verify-email-confirm:user:" + userId,
            verifyEmailConfirmMaxPerUser,
            verifyEmailConfirmWindowMillis,
            "Demasiados intentos de confirmación de email. Reintentá más tarde",
            now
        );
        checkWindowCounter(
            "verify-email-confirm:userip:" + userId + ":" + ip,
            verifyEmailConfirmMaxPerUserIp,
            verifyEmailConfirmWindowMillis,
            "Demasiados intentos de confirmación de email. Reintentá más tarde",
            now
        );
        maybeCleanup(now);
    }

    // --- Phone Verification Send ---

    /**
     * Fuerza la regla telefono verification send allowed antes de permitir que continue el flujo.
     * Esta separacion hace explicita la regla de seguridad o negocio que protege el flujo.
     */
    public void enforcePhoneVerificationSendAllowed(String userId, HttpServletRequest request) {
        String ip = extractClientIp(request);
        long now = System.currentTimeMillis();

        checkWindowCounter(
            "verify-phone-send:user:" + userId,
            verifyPhoneSendMaxPerUser,
            verifyPhoneSendWindowMillis,
            "Demasiados envíos de verificación de teléfono. Reintentá más tarde",
            now
        );
        checkWindowCounter(
            "verify-phone-send:userip:" + userId + ":" + ip,
            verifyPhoneSendMaxPerUserIp,
            verifyPhoneSendWindowMillis,
            "Demasiados envíos de verificación de teléfono. Reintentá más tarde",
            now
        );
        maybeCleanup(now);
    }

    // --- Phone Verification Confirm ---

    /**
     * Fuerza la regla telefono verification confirm allowed antes de permitir que continue el flujo.
     * Esta separacion hace explicita la regla de seguridad o negocio que protege el flujo.
     */
    public void enforcePhoneVerificationConfirmAllowed(String userId, HttpServletRequest request) {
        String ip = extractClientIp(request);
        long now = System.currentTimeMillis();

        checkWindowCounter(
            "verify-phone-confirm:user:" + userId,
            verifyPhoneConfirmMaxPerUser,
            verifyPhoneConfirmWindowMillis,
            "Demasiados intentos de confirmación de teléfono. Reintentá más tarde",
            now
        );
        checkWindowCounter(
            "verify-phone-confirm:userip:" + userId + ":" + ip,
            verifyPhoneConfirmMaxPerUserIp,
            verifyPhoneConfirmWindowMillis,
            "Demasiados intentos de confirmación de teléfono. Reintentá más tarde",
            now
        );
        maybeCleanup(now);
    }

    // --- Challenge Send ---

    /**
     * Fuerza la regla challenge send allowed antes de permitir que continue el flujo.
     * Esta separacion hace explicita la regla de seguridad o negocio que protege el flujo.
     */
    public void enforceChallengeSendAllowed(String userId, HttpServletRequest request) {
        String ip = extractClientIp(request);
        long now = System.currentTimeMillis();

        checkWindowCounter(
            "challenge-send:user:" + userId,
            challengeSendMaxPerUser,
            challengeSendWindowMillis,
            "Demasiados envíos de challenge. Reintentá más tarde",
            now
        );
        checkWindowCounter(
            "challenge-send:userip:" + userId + ":" + ip,
            challengeSendMaxPerUserIp,
            challengeSendWindowMillis,
            "Demasiados envíos de challenge. Reintentá más tarde",
            now
        );
        maybeCleanup(now);
    }

    // --- Challenge Verify ---

    /**
     * Fuerza la regla challenge verify allowed antes de permitir que continue el flujo.
     * Esta separacion hace explicita la regla de seguridad o negocio que protege el flujo.
     */
    public void enforceChallengeVerifyAllowed(String userId, HttpServletRequest request) {
        String ip = extractClientIp(request);
        long now = System.currentTimeMillis();

        checkWindowCounter(
            "challenge-verify:user:" + userId,
            challengeVerifyMaxPerUser,
            challengeVerifyWindowMillis,
            "Demasiados intentos de verificación de challenge. Reintentá más tarde",
            now
        );
        checkWindowCounter(
            "challenge-verify:userip:" + userId + ":" + ip,
            challengeVerifyMaxPerUserIp,
            challengeVerifyWindowMillis,
            "Demasiados intentos de verificación de challenge. Reintentá más tarde",
            now
        );
        maybeCleanup(now);
    }

    // --- Refresh ---

    /**
     * Fuerza la regla refresh allowed antes de permitir que continue el flujo.
     * Esta separacion hace explicita la regla de seguridad o negocio que protege el flujo.
     */
    public void enforceRefreshAllowed(String userId, HttpServletRequest request) {
        String ip = extractClientIp(request);
        long now = System.currentTimeMillis();

        if (userId != null) {
            checkWindowCounter(
                "refresh:user:" + userId,
                refreshMaxPerUser,
                refreshWindowMillis,
                "Demasiados intentos de refresh. Reintentá más tarde",
                now
            );
        }
        checkWindowCounter(
            "refresh:ip:" + ip,
            refreshMaxPerIp,
            refreshWindowMillis,
            "Demasiados intentos de refresh. Reintentá más tarde",
            now
        );
        maybeCleanup(now);
    }

    // --- Internal ---

    /**
     * Ejecuta la logica de blocked until manteniendola encapsulada en este componente.
     */
    private long blockedUntil(String key, long now) {
        LoginAttemptState state = loginStates.get(key);
        if (state == null) {
            return 0L;
        }
        if (state.windowStartMillis + loginWindowMillis < now) {
            loginStates.remove(key);
            return 0L;
        }
        return state.blockedUntilMillis;
    }

    /**
     * Ejecuta la logica de increase failure manteniendola encapsulada en este componente.
     */
    private void increaseFailure(String key, long now) {
        loginStates.compute(
            key,
            (ignored, current) -> {
                LoginAttemptState state = current;
                if (state == null || state.windowStartMillis + loginWindowMillis < now) {
                    state = new LoginAttemptState(now, 0, 0L);
                }

                int failures = state.failures + 1;
                long blockedUntil = state.blockedUntilMillis;
                if (failures >= loginMaxFailures) {
                    int exponent = Math.min(6, failures - loginMaxFailures);
                    long blockSeconds = Math.min(
                        loginMaxBlockSeconds,
                        loginBaseBlockSeconds * (1L << exponent)
                    );
                    blockedUntil = Math.max(blockedUntil, now + (blockSeconds * 1000L));
                }
                return new LoginAttemptState(state.windowStartMillis, failures, blockedUntil);
            }
        );
    }

    /**
     * Verifica ventana counter y devuelve el resultado de la validacion.
     */
    private void checkWindowCounter(
        String key,
        int maxAttempts,
        long windowMillis,
        String errorMessage,
        long now
    ) {
        counterStates.compute(
            key,
            (ignored, current) -> {
                WindowCounter counter = current;
                if (counter == null || counter.windowStartMillis + windowMillis < now) {
                    counter = new WindowCounter(now, 0);
                }
                if (counter.count >= maxAttempts) {
                    long retryAfterSeconds = Math.max(1L, (counter.windowStartMillis + windowMillis - now + 999) / 1000);
                    throw new ResponseStatusException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        errorMessage + ". Reintentá en " + retryAfterSeconds + "s"
                    );
                }
                return new WindowCounter(counter.windowStartMillis, counter.count + 1);
            }
        );
    }

    /**
     * Ejecuta la logica de maybe cleanup manteniendola encapsulada en este componente.
     */
    private void maybeCleanup(long now) {
        long current = operationCounter.incrementAndGet();
        if (current % CLEANUP_EVERY != 0) {
            return;
        }
        loginStates.entrySet().removeIf(
            entry -> entry.getValue() == null || entry.getValue().windowStartMillis + loginWindowMillis < now
        );
        counterStates.entrySet().removeIf(
            entry -> entry.getValue() == null || entry.getValue().windowStartMillis + maxCounterWindowMillis < now
        );
    }

    /**
     * Normaliza email para evitar variantes vacias, invalidas o inconsistentes.
     */
    private String normalizeEmail(String email) {
        if (email == null) {
            return "";
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    String extractClientIp(HttpServletRequest request) {
        if (request == null) {
            return "unknown";
        }
        if (trustForwardedHeaders) {
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                int comma = forwarded.indexOf(',');
                return (comma >= 0 ? forwarded.substring(0, comma) : forwarded).trim();
            }
            String realIp = request.getHeader("X-Real-IP");
            if (realIp != null && !realIp.isBlank()) {
                return realIp.trim();
            }
        }
        return request.getRemoteAddr();
    }

    /**
     * Bloque de datos login attempt state usado internamente por esta clase.
     * Agrupa valores relacionados para que el calculo principal sea mas legible.
     */
    private record LoginAttemptState(long windowStartMillis, int failures, long blockedUntilMillis) {}

    /**
     * Bloque de datos window counter usado internamente por esta clase.
     * Agrupa valores relacionados para que el calculo principal sea mas legible.
     */
    private record WindowCounter(long windowStartMillis, int count) {}

    /**
     * Ejecuta la logica de positive ventana millis manteniendola encapsulada en este componente.
     */
    private long positiveWindowMillis(long seconds) {
        return Duration.ofSeconds(positiveLong(seconds, 1L)).toMillis();
    }

    /**
     * Ejecuta la logica de positive int manteniendola encapsulada en este componente.
     */
    private int positiveInt(int value, int fallback) {
        return value > 0 ? value : fallback;
    }

    /**
     * Ejecuta la logica de positive long manteniendola encapsulada en este componente.
     */
    private long positiveLong(long value, long fallback) {
        return value > 0 ? value : fallback;
    }
}
