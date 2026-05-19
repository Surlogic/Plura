package com.plura.plurabackend.core.auth.dto;

/**
 * Respuesta de disponibilidad de datos de registro.
 */
public record RegistrationAvailabilityResponse(
    boolean emailAvailable,
    boolean phoneAvailable,
    String emailError,
    String phoneError
) {}
