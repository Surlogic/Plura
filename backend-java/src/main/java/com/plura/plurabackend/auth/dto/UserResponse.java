package com.plura.plurabackend.auth.dto;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UserResponse {
    // Identificador único del usuario.
    private String id;
    // Email público del usuario.
    private String email;
    // Nombre para mostrar.
    private String fullName;
    // Fecha de creación de la cuenta.
    private LocalDateTime createdAt;
}
