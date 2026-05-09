package com.plura.plurabackend.core.auth.context;

/**
 * AuthContextType es un enum de dominio del modulo autenticacion / contexto de sesion.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: autenticacion y sesiones.
 */
public enum AuthContextType {
    CLIENT,
    PROFESSIONAL,
    WORKER
}
