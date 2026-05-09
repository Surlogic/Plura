package com.plura.plurabackend.core.auth.dto;

import lombok.Data;

/**
 * ConfirmEmailVerificationRequest es un DTO de entrada del modulo autenticacion / contratos DTO.
 * Responsabilidad: definir y validar los datos que llegan desde la API.
 * Validacion: sus anotaciones Bean Validation son parte del contrato publico del endpoint que lo recibe.
 * Foco funcional: email transaccional.
 */
@Data
public class ConfirmEmailVerificationRequest {

    private String code;
}
