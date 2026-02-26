package com.plura.plurabackend.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class RegisterResponse {
    // JWT de acceso (opcional si se usa cookie HttpOnly).
    private String accessToken;
    // Datos públicos del usuario creado.
    private UserResponse user;
}
