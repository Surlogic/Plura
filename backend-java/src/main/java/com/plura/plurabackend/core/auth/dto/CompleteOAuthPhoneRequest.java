package com.plura.plurabackend.core.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * CompleteOAuthPhoneRequest es un DTO de entrada del modulo autenticacion / contratos DTO.
 * Responsabilidad: definir y validar los datos que llegan desde la API.
 * Validacion: sus anotaciones Bean Validation son parte del contrato publico del endpoint que lo recibe.
 * Foco funcional: telefono, OAuth, autenticacion y sesiones.
 */
@Data
public class CompleteOAuthPhoneRequest {

    @NotBlank
    @Size(max = 40)
    private String phoneNumber;

    @Size(max = 4096)
    private String phoneVerificationToken;
}
