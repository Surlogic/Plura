package com.plura.plurabackend.core.review.model;

/**
 * BookingReviewReportStatus es un enum de dominio del modulo resenas / modelo.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: reservas, resenas.
 */
public enum BookingReviewReportStatus {
    OPEN,
    REVIEWED,
    RESOLVED
}
