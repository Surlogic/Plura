package com.plura.plurabackend.core.notification.email;

import java.time.LocalDateTime;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class NotificationEmailRetryPolicy {

    private final int maxAttempts;
    private final long initialDelaySeconds;
    private final long maxDelaySeconds;

    public NotificationEmailRetryPolicy(
        @Value("${app.notification.email.max-attempts:5}") int maxAttempts,
        @Value("${app.notification.email.initial-delay-seconds:60}") long initialDelaySeconds,
        @Value("${app.notification.email.max-delay-seconds:3600}") long maxDelaySeconds
    ) {
        this.maxAttempts = Math.max(1, maxAttempts);
        this.initialDelaySeconds = Math.max(1L, initialDelaySeconds);
        this.maxDelaySeconds = Math.max(this.initialDelaySeconds, maxDelaySeconds);
    }

    public RetryDecision evaluateNextAttempt(int attemptCount, LocalDateTime now) {
        if (attemptCount >= maxAttempts) {
            return new RetryDecision(false, null);
        }
        long exponent = Math.max(0, attemptCount - 1);
        long delaySeconds = initialDelaySeconds;
        for (int i = 0; i < exponent; i++) {
            if (delaySeconds >= maxDelaySeconds / 2L) {
                delaySeconds = maxDelaySeconds;
                break;
            }
            delaySeconds = Math.min(maxDelaySeconds, delaySeconds * 2L);
        }
        return new RetryDecision(true, now.plusSeconds(delaySeconds));
    }

    public record RetryDecision(boolean shouldRetry, LocalDateTime nextAttemptAt) {}
}
