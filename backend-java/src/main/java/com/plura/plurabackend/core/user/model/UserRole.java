package com.plura.plurabackend.core.user.model;

/**
 * UserRole es un enum de dominio del modulo usuarios / modelo.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: usuarios.
 */
public enum UserRole {
    USER,
    PROFESSIONAL
}
