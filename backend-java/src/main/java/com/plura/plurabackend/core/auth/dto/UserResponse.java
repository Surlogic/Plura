package com.plura.plurabackend.core.auth.dto;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * DTO de respuesta con los datos publicos del usuario autenticado.
 * Contiene la informacion basica del perfil visible para el propio usuario.
 */
@Data
@AllArgsConstructor
public class UserResponse {
    /** Identificador unico del usuario. */
    private String id;
    /** Email registrado del usuario. */
    private String email;
    /** Nombre completo para mostrar. */
    private String fullName;
    /** Indica si el email ha sido verificado por el usuario. */
    private boolean emailVerified;
    /** Numero de telefono principal de la cuenta. */
    private String phoneNumber;
    /** Indica si el telefono ha sido verificado por el usuario. */
    private boolean phoneVerified;
    /** Fecha y hora de creacion de la cuenta. */
    private LocalDateTime createdAt;
}
