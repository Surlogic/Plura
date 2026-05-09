package com.plura.plurabackend.core.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * EmailVerificationSendResponse es un DTO de respuesta del modulo autenticacion / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: email transaccional.
 */
@Data
@AllArgsConstructor
public class EmailVerificationSendResponse {

    private String message;
    private Long cooldownSeconds;
}
