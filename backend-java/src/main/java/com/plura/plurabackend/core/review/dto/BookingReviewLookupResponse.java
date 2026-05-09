package com.plura.plurabackend.core.review.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * BookingReviewLookupResponse es un DTO de respuesta del modulo resenas / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: reservas, resenas.
 */
@Data
@AllArgsConstructor
public class BookingReviewLookupResponse {
    private boolean exists;
    private BookingReviewResponse review;

    /**
     * Ejecuta la logica de missing manteniendola encapsulada en este componente.
     */
    public static BookingReviewLookupResponse missing() {
        return new BookingReviewLookupResponse(false, null);
    }

    /**
     * Ejecuta la logica de found manteniendola encapsulada en este componente.
     */
    public static BookingReviewLookupResponse found(BookingReviewResponse review) {
        return new BookingReviewLookupResponse(true, review);
    }
}
