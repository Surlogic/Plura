package com.plura.plurabackend.core.auth.model;

/**
 * OtpChallengePurpose es un enum de dominio del modulo autenticacion / modelo.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: OTP.
 */
public enum OtpChallengePurpose {
    ACCOUNT_DELETION,
    PASSWORD_CHANGE,
    PASSWORD_RECOVERY
}
