package com.plura.plurabackend.professional.plan;

/**
 * PublicProfileTier es un enum de dominio del modulo profesionales / planes.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: perfiles, superficie publica.
 */
public enum PublicProfileTier {
    BASIC,
    ENHANCED
}
