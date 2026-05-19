package com.plura.plurabackend.core.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * DTO para consultar disponibilidad temprana de datos de registro.
 */
@Data
public class RegistrationAvailabilityRequest {

    @Email
    @Size(max = 255)
    private String email;

    @Size(max = 30)
    private String phoneNumber;
}
