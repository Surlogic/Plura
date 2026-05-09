package com.plura.plurabackend.core.feedback.model;

/**
 * FeedbackCategory es un enum de dominio del modulo feedback / modelo.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: categorias, feedback.
 */
public enum FeedbackCategory {
    BUG,
    UX,
    PAYMENTS,
    BOOKING,
    DISCOVERY,
    OTHER
}
