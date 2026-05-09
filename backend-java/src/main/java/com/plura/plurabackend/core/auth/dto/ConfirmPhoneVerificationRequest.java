package com.plura.plurabackend.core.auth.dto;

import lombok.Data;

/**
 * ConfirmPhoneVerificationRequest es un DTO de entrada del modulo autenticacion / contratos DTO.
 * Responsabilidad: definir y validar los datos que llegan desde la API.
 * Validacion: sus anotaciones Bean Validation son parte del contrato publico del endpoint que lo recibe.
 * Foco funcional: telefono.
 */
@Data
public class ConfirmPhoneVerificationRequest {
    private String code;
}
