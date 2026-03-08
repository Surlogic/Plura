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
    // Refresh token expuesto solo para clientes body-first como mobile.
    private String refreshToken;
    // Datos públicos del usuario creado.
    private UserResponse user;
    // Sesión actual emitida por el backend.
    private AuthSessionResponse session;
}
