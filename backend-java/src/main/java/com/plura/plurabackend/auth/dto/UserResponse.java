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
    // Estado de verificación first-party del email.
    private boolean emailVerified;
    // Teléfono principal de la cuenta.
    private String phoneNumber;
    // Estado de verificación first-party del teléfono.
    private boolean phoneVerified;
    // Fecha de creación de la cuenta.
    private LocalDateTime createdAt;
}
