package com.plura.plurabackend.auth.dto;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * DTO de respuesta tras enviar un desafio OTP exitosamente.
 * Contiene la informacion necesaria para que el cliente complete la verificacion.
 */
@Data
@AllArgsConstructor
public class OtpChallengeSendResponse {
    /** Identificador unico del desafio OTP generado. */
    private String challengeId;
    /** Fecha y hora de expiracion del desafio OTP. */
    private LocalDateTime expiresAt;
    /** Destino enmascarado al cual se envio el codigo (ej: g***@mail.com). */
    private String maskedDestination;
}
