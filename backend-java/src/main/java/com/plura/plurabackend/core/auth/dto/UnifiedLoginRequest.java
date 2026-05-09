package com.plura.plurabackend.core.auth.dto;

import com.plura.plurabackend.core.auth.context.AuthContextType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * UnifiedLoginRequest es un DTO de entrada del modulo autenticacion / contratos DTO.
 * Responsabilidad: definir y validar los datos que llegan desde la API.
 * Validacion: sus anotaciones Bean Validation son parte del contrato publico del endpoint que lo recibe.
 * Foco funcional: la responsabilidad indicada por su paquete y nombre.
 */
@Data
public class UnifiedLoginRequest {

    @NotBlank
    @Email
    @Size(max = 255)
    private String email;

    @NotBlank
    @Size(min = 8, max = 100)
    private String password;

    private AuthContextType desiredContext;

    private String desiredWorkerId;

    private String desiredProfessionalId;
}
