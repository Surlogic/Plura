package com.plura.plurabackend.auth.dto;

import lombok.Data;

/**
 * DTO de solicitud para enviar un codigo de verificacion por SMS al telefono del usuario.
 * Inicia el flujo de verificacion de numero de telefono.
 */
@Data
public class SendPhoneVerificationRequest {
    /** Numero de telefono al cual se enviara el codigo de verificacion por SMS. */
    private String phoneNumber;
}
