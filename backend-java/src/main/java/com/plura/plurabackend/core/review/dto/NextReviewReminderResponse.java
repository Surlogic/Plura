package com.plura.plurabackend.core.review.dto;

/**
 * NextReviewReminderResponse es un modelo inmutable del modulo resenas / contratos DTO.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: resenas.
 */
public record NextReviewReminderResponse(
    boolean exists,
    ReviewReminderResponse reminder
) {
    /**
     * Ejecuta la logica de missing manteniendola encapsulada en este componente.
     */
    public static NextReviewReminderResponse missing() {
        return new NextReviewReminderResponse(false, null);
    }

    /**
     * Ejecuta la logica de found manteniendola encapsulada en este componente.
     */
    public static NextReviewReminderResponse found(ReviewReminderResponse reminder) {
        return new NextReviewReminderResponse(true, reminder);
    }
}
