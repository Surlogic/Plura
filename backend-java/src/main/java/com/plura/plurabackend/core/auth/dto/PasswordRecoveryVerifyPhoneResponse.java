package com.plura.plurabackend.core.auth.dto;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * PasswordRecoveryVerifyPhoneResponse es un DTO de respuesta del modulo autenticacion / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: contrasenas, telefono.
 */
@Data
@AllArgsConstructor
public class PasswordRecoveryVerifyPhoneResponse {
    private String challengeId;
    private LocalDateTime expiresAt;
    private String maskedDestination;
}
