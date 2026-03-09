package com.plura.plurabackend.auth.dto;

/**
 * DTO de respuesta que confirma que un registro fue aceptado y esta siendo procesado.
 * Se utiliza cuando el registro requiere pasos adicionales antes de completarse.
 *
 * @param message Mensaje informativo sobre el estado del registro.
 */
public record RegistrationAcceptedResponse(String message) {}
