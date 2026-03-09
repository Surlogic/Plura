package com.plura.plurabackend.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * DTO de respuesta tras intentar verificar un desafio OTP.
 * Indica si el codigo proporcionado fue correcto.
 */
@Data
@AllArgsConstructor
public class OtpChallengeVerifyResponse {
    /** Indica si la verificacion del codigo OTP fue exitosa. */
    private boolean verified;
}
