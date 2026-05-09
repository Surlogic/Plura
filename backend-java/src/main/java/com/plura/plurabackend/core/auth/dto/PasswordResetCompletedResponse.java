package com.plura.plurabackend.core.auth.dto;

/**
 * PasswordResetCompletedResponse es un modelo inmutable del modulo autenticacion / contratos DTO.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: contrasenas.
 */
public record PasswordResetCompletedResponse(String role) {}
