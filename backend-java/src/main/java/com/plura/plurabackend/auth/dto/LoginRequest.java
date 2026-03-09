package com.plura.plurabackend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * DTO de solicitud para iniciar sesion en el sistema.
 * Contiene las credenciales del usuario (email y contrasena).
 */
@Data
public class LoginRequest {

    /** Email del usuario utilizado como identificador de cuenta. */
    @NotBlank
    @Email
    @Size(max = 255)
    private String email;

    /** Contrasena en texto plano que sera verificada contra el hash almacenado. */
    @NotBlank
    @Size(min = 8, max = 100)
    private String password;
}
