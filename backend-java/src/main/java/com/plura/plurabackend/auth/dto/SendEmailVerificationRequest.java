package com.plura.plurabackend.auth.dto;

import lombok.Data;

/**
 * DTO de solicitud para enviar un codigo de verificacion al email del usuario.
 * Inicia el flujo de verificacion de correo electronico.
 */
@Data
public class SendEmailVerificationRequest {

    /** Email al cual se enviara el codigo de verificacion. */
    private String email;
}
