package com.plura.plurabackend.core.auth.dto;

import lombok.Data;

/**
 * CloseProfessionalProfileRequest es un DTO de entrada para cerrar la faceta profesional.
 * Reutiliza el challenge OTP de eliminacion de cuenta sin recibir identificadores externos.
 */
@Data
public class CloseProfessionalProfileRequest {
    private String challengeId;
    private String code;
}
