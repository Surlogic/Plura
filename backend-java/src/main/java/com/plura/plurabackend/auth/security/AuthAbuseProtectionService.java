package com.plura.plurabackend.auth.security;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Duration;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthAbuseProtectionService {

    private static final long LOGIN_WINDOW_MILLIS = Duration.ofMinutes(15).toMillis();
    private static final int LOGIN_MAX_FAILURES = 5;
    private static final long LOGIN_BASE_BLOCK_SECONDS = 30;
    private static final long LOGIN_MAX_BLOCK_SECONDS = 900;

    private static final long REGISTER_WINDOW_MILLIS = Duration.ofMinutes(30).toMillis();
    private static final int REGISTER_MAX_ATTEMPTS_PER_EMAIL = 8;
    private static final int REGISTER_MAX_ATTEMPTS_PER_EMAIL_AND_IP = 5;

    private static final long CLEANUP_EVERY = 500;

    private final boolean trustForwardedHeaders;
    private final ConcurrentHashMap<String, LoginAttemptState> loginStates = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, WindowCounter> registerStates = new ConcurrentHashMap<>();
    private final AtomicLong operationCounter = new AtomicLong(0);

    public AuthAbuseProtectionService(
        @Value("${app.security.trust-forwarded-headers:false}") boolean trustForwardedHeaders
    ) {
        this.trustForwardedHeaders = trustForwardedHeaders;
    }

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

    public void recordLoginFailure(String email, HttpServletRequest request) {
        String normalizedEmail = normalizeEmail(email);
        String ip = extractClientIp(request);
        long now = System.currentTimeMillis();
        increaseFailure("login:acct:" + normalizedEmail, now);
        increaseFailure("login:acctip:" + normalizedEmail + ":" + ip, now);
        maybeCleanup(now);
    }

    public void recordLoginSuccess(String email, HttpServletRequest request) {
        String normalizedEmail = normalizeEmail(email);
        String ip = extractClientIp(request);
        loginStates.remove("login:acct:" + normalizedEmail);
        loginStates.remove("login:acctip:" + normalizedEmail + ":" + ip);
    }

    public void enforceRegistrationAllowed(String email, HttpServletRequest request) {
        String normalizedEmail = normalizeEmail(email);
        String ip = extractClientIp(request);
        long now = System.currentTimeMillis();

        checkWindowCounter(
            "register:email:" + normalizedEmail,
            REGISTER_MAX_ATTEMPTS_PER_EMAIL,
            now
        );
        checkWindowCounter(
            "register:emailip:" + normalizedEmail + ":" + ip,
            REGISTER_MAX_ATTEMPTS_PER_EMAIL_AND_IP,
            now
        );
        maybeCleanup(now);
    }

    private long blockedUntil(String key, long now) {
        LoginAttemptState state = loginStates.get(key);
        if (state == null) {
            return 0L;
        }
        if (state.windowStartMillis + LOGIN_WINDOW_MILLIS < now) {
            loginStates.remove(key);
            return 0L;
        }
        return state.blockedUntilMillis;
    }

    private void increaseFailure(String key, long now) {
        loginStates.compute(
            key,
            (ignored, current) -> {
                LoginAttemptState state = current;
                if (state == null || state.windowStartMillis + LOGIN_WINDOW_MILLIS < now) {
                    state = new LoginAttemptState(now, 0, 0L);
                }

                int failures = state.failures + 1;
                long blockedUntil = state.blockedUntilMillis;
                if (failures >= LOGIN_MAX_FAILURES) {
                    int exponent = Math.min(6, failures - LOGIN_MAX_FAILURES);
                    long blockSeconds = Math.min(
                        LOGIN_MAX_BLOCK_SECONDS,
                        LOGIN_BASE_BLOCK_SECONDS * (1L << exponent)
                    );
                    blockedUntil = Math.max(blockedUntil, now + (blockSeconds * 1000L));
                }
                return new LoginAttemptState(state.windowStartMillis, failures, blockedUntil);
            }
        );
    }

    private void checkWindowCounter(String key, int maxAttempts, long now) {
        registerStates.compute(
            key,
            (ignored, current) -> {
                WindowCounter counter = current;
                if (counter == null || counter.windowStartMillis + REGISTER_WINDOW_MILLIS < now) {
                    counter = new WindowCounter(now, 0);
                }
                if (counter.count >= maxAttempts) {
                    throw new ResponseStatusException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "Demasiados intentos de registro. Reintentá más tarde"
                    );
                }
                return new WindowCounter(counter.windowStartMillis, counter.count + 1);
            }
        );
    }

    private void maybeCleanup(long now) {
        long current = operationCounter.incrementAndGet();
        if (current % CLEANUP_EVERY != 0) {
            return;
        }
        loginStates.entrySet().removeIf(
            entry -> entry.getValue() == null || entry.getValue().windowStartMillis + LOGIN_WINDOW_MILLIS < now
        );
        registerStates.entrySet().removeIf(
            entry -> entry.getValue() == null || entry.getValue().windowStartMillis + REGISTER_WINDOW_MILLIS < now
        );
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            return "";
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String extractClientIp(HttpServletRequest request) {
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

    private record LoginAttemptState(long windowStartMillis, int failures, long blockedUntilMillis) {}

    private record WindowCounter(long windowStartMillis, int count) {}
}
