package com.plura.plurabackend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {

    // Nombre visible del usuario.
    @NotBlank
    @Size(min = 3)
    private String fullName;

    // Email único usado como identificador.
    @NotBlank
    @Email
    private String email;

    // Teléfono de contacto.
    @NotBlank
    private String phoneNumber;

    // Contraseña en texto plano (se hashea al persistir).
    @NotBlank
    @Size(min = 10, max = 72)
    private String password;
}
