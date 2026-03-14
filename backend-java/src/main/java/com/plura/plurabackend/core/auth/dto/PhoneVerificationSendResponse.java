package com.plura.plurabackend.core.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * DTO de respuesta tras solicitar el envio de un codigo de verificacion de telefono.
 * Informa al cliente si el envio fue exitoso y cuanto tiempo debe esperar antes de solicitar otro.
 */
@Data
@AllArgsConstructor
public class PhoneVerificationSendResponse {
    /** Mensaje informativo sobre el resultado del envio. */
    private String message;
    /** Segundos de espera antes de poder solicitar un nuevo codigo (cooldown). */
    private Long cooldownSeconds;
}
