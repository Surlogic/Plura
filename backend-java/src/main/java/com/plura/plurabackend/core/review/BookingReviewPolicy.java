package com.plura.plurabackend.core.review;

import java.time.Duration;
import java.time.LocalDateTime;

public final class BookingReviewPolicy {

    public static final int REVIEW_WINDOW_DAYS = 7;
    public static final int MAX_REMINDERS_PER_BOOKING = 3;
    public static final Duration REMINDER_MIN_INTERVAL = Duration.ofDays(1);

    private BookingReviewPolicy() {
    }

    public static LocalDateTime resolveReviewWindowEndsAt(LocalDateTime completedAt) {
        if (completedAt == null) {
            return null;
        }
        return completedAt.plusDays(REVIEW_WINDOW_DAYS);
    }

    public static boolean isWithinReviewWindow(LocalDateTime completedAt, LocalDateTime now) {
        LocalDateTime reviewWindowEndsAt = resolveReviewWindowEndsAt(completedAt);
        return completedAt != null && reviewWindowEndsAt != null && !reviewWindowEndsAt.isBefore(now);
    }

    public static boolean reachedReminderLimit(Integer reminderCount) {
        return reminderCount != null && reminderCount >= MAX_REMINDERS_PER_BOOKING;
    }

    public static boolean respectsReminderCadence(LocalDateTime lastRemindedAt, LocalDateTime now) {
        return lastRemindedAt == null || !lastRemindedAt.plus(REMINDER_MIN_INTERVAL).isAfter(now);
    }
}
