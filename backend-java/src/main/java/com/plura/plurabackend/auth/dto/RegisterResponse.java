package com.plura.plurabackend.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class RegisterResponse {
    // JWT de acceso para el cliente recién registrado.
    private String accessToken;
    // Datos públicos del usuario creado.
    private UserResponse user;
}
