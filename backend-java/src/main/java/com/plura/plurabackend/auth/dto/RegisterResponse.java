package com.plura.plurabackend.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RegisterResponse {
    // JWT de acceso (opcional si se usa cookie HttpOnly).
    private String accessToken;
    // Datos públicos del usuario creado.
    private UserResponse user;
}
