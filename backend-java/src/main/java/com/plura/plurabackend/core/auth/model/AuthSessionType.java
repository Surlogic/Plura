package com.plura.plurabackend.core.auth.model;

/**
 * AuthSessionType es un enum de dominio del modulo autenticacion / modelo.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: sesiones, autenticacion y sesiones.
 */
public enum AuthSessionType {
    WEB,
    MOBILE
}
