package com.plura.plurabackend.core.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * DTO de solicitud para registrar un nuevo usuario (cliente) en la plataforma.
 * Contiene los datos basicos necesarios para crear una cuenta de usuario.
 */
@Data
public class RegisterRequest {

    /** Nombre visible del usuario. */
    @NotBlank
    @Size(min = 2, max = 120)
    private String fullName;

    /** Email unico usado como identificador de la cuenta. */
    @NotBlank
    @Email
    @Size(max = 255)
    private String email;

    /** Telefono de contacto del usuario. */
    @NotBlank
    @Size(max = 30)
    @Pattern(regexp = "^[+0-9()\\-\\s]{3,30}$")
    private String phoneNumber;

    /** Contrasena en texto plano (se hashea al persistir). */
    @NotBlank
    @Size(min = 8, max = 100)
    private String password;
}
