package com.plura.plurabackend.professional.plan;

/**
 * ScheduleTier es un enum de dominio del modulo profesionales / planes.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: agenda.
 */
public enum ScheduleTier {
    DAILY,
    WEEKLY,
    MASTER
}
