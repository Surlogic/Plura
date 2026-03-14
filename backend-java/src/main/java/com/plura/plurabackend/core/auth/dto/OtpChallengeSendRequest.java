package com.plura.plurabackend.core.auth.dto;

import lombok.Data;

/**
 * DTO de solicitud para enviar un desafio OTP (One-Time Password) al usuario.
 * Especifica el proposito del desafio y el canal de entrega.
 */
@Data
public class OtpChallengeSendRequest {
    /** Proposito del desafio OTP (ej: ACCOUNT_DELETION, PASSWORD_CHANGE). */
    private String purpose;
    /** Canal por el cual se enviara el codigo OTP (ej: EMAIL, SMS). */
    private String channel;
}
