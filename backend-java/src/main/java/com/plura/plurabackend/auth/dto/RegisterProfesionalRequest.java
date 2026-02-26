package com.plura.plurabackend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterProfesionalRequest {

    // Nombre visible del profesional/empresa.
    @NotBlank
    @Size(min = 3)
    private String fullName;

    // Rubro o categoría principal.
    @NotBlank
    private String rubro;

    // Email único usado como identificador.
    @NotBlank
    @Email
    private String email;

    // Teléfono de contacto.
    @NotBlank
    private String phoneNumber;

    // Ubicación del local (si aplica).
    private String location;

    // Define si tiene local o es a domicilio.
    @NotBlank
    private String tipoCliente;

    // Contraseña en texto plano (se hashea al persistir).
    @NotBlank
    @Size(min = 10, max = 72)
    private String password;
}
