package com.plura.plurabackend.core.review;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * BookingReviewPolicy es un componente de dominio del modulo resenas.
 * Responsabilidad: encapsular comportamiento propio del modulo y mantenerlo fuera de controllers u otras capas.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: reservas, resenas.
 */
public final class BookingReviewPolicy {

    public static final int REVIEW_WINDOW_DAYS = 7;
    public static final int MAX_REMINDERS_PER_BOOKING = 3;
    public static final Duration REMINDER_MIN_INTERVAL = Duration.ofDays(1);

    private BookingReviewPolicy() {
    }

    /**
     * Resuelve resena window ends at normalizando entradas, defaults y casos borde.
     */
    public static LocalDateTime resolveReviewWindowEndsAt(LocalDateTime completedAt) {
        if (completedAt == null) {
            return null;
        }
        return completedAt.plusDays(REVIEW_WINDOW_DAYS);
    }

    /**
     * Evalua is within resena window y devuelve una decision booleana para el llamador.
     */
    public static boolean isWithinReviewWindow(LocalDateTime completedAt, LocalDateTime now) {
        LocalDateTime reviewWindowEndsAt = resolveReviewWindowEndsAt(completedAt);
        return completedAt != null && reviewWindowEndsAt != null && !reviewWindowEndsAt.isBefore(now);
    }

    /**
     * Ejecuta la logica de reached reminder limit manteniendola encapsulada en este componente.
     */
    public static boolean reachedReminderLimit(Integer reminderCount) {
        return reminderCount != null && reminderCount >= MAX_REMINDERS_PER_BOOKING;
    }

    /**
     * Ejecuta la logica de respects reminder cadence manteniendola encapsulada en este componente.
     */
    public static boolean respectsReminderCadence(LocalDateTime lastRemindedAt, LocalDateTime now) {
        return lastRemindedAt == null || !lastRemindedAt.plus(REMINDER_MIN_INTERVAL).isAfter(now);
    }
}
