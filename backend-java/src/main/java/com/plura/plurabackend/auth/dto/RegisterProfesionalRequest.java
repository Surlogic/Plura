package com.plura.plurabackend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.Data;

@Data
public class RegisterProfesionalRequest {

    // Nombre visible del profesional/empresa.
    @NotBlank
    @Size(min = 3)
    private String fullName;

    // Rubro o categoría principal.
    private String rubro;

    // Slugs de categorías seleccionadas.
    private List<String> categorySlugs;

    // Email único usado como identificador.
    @NotBlank
    @Email
    private String email;

    // Teléfono de contacto.
    @NotBlank
    private String phoneNumber;

    // Ubicación del local (si aplica).
    private String location;

    // Coordenadas geocodificadas de la ubicación.
    private Double latitude;
    private Double longitude;

    // Define si tiene local o es a domicilio.
    @NotBlank
    private String tipoCliente;

    // Contraseña en texto plano (se hashea al persistir).
    @NotBlank
    @Size(min = 10, max = 72)
    private String password;
}
