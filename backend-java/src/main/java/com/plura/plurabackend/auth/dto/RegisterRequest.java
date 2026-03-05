package com.plura.plurabackend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {

    // Nombre visible del usuario.
    @NotBlank
    @Size(min = 2, max = 120)
    private String fullName;

    // Email único usado como identificador.
    @NotBlank
    @Email
    @Size(max = 255)
    private String email;

    // Teléfono de contacto.
    @NotBlank
    @Size(max = 30)
    @Pattern(regexp = "^[+0-9()\\-\\s]{3,30}$")
    private String phoneNumber;

    // Contraseña en texto plano (se hashea al persistir).
    @NotBlank
    @Size(min = 8, max = 100)
    private String password;
}
