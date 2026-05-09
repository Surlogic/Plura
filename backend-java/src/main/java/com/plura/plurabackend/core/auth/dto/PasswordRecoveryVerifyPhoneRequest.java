package com.plura.plurabackend.core.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * PasswordRecoveryVerifyPhoneRequest es un DTO de entrada del modulo autenticacion / contratos DTO.
 * Responsabilidad: definir y validar los datos que llegan desde la API.
 * Validacion: sus anotaciones Bean Validation son parte del contrato publico del endpoint que lo recibe.
 * Foco funcional: contrasenas, telefono.
 */
@Data
public class PasswordRecoveryVerifyPhoneRequest {

    @NotBlank
    @Email
    @Size(max = 255)
    private String email;

    @NotBlank
    @Size(max = 40)
    private String phoneNumber;
}
