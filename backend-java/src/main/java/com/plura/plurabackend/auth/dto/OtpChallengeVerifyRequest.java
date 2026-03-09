package com.plura.plurabackend.auth.dto;

import lombok.Data;

/**
 * DTO de solicitud para verificar un desafio OTP.
 * El usuario envia el identificador del desafio y el codigo recibido.
 */
@Data
public class OtpChallengeVerifyRequest {
    /** Identificador unico del desafio OTP a verificar. */
    private String challengeId;
    /** Codigo OTP ingresado por el usuario. */
    private String code;
}
