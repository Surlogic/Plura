package com.plura.plurabackend.core.review.model;

/**
 * BookingReviewReportReason es un enum de dominio del modulo resenas / modelo.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: reservas, resenas.
 */
public enum BookingReviewReportReason {
    SPAM,
    OFFENSIVE,
    FALSE_INFORMATION,
    HARASSMENT,
    OTHER
}
