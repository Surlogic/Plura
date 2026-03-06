package com.plura.plurabackend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.Data;

@Data
public class RegisterProfesionalRequest {

    // Nombre visible del profesional/empresa.
    @NotBlank
    @Size(min = 2, max = 120)
    private String fullName;

    // Rubro o categoría principal.
    private String rubro;

    // Slugs de categorías seleccionadas.
    private List<String> categorySlugs;

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

    // País del negocio.
    @NotBlank
    @Size(max = 80)
    private String country;

    // Ciudad del negocio.
    @NotBlank
    @Size(max = 120)
    private String city;

    // Dirección completa del negocio.
    @NotBlank
    @Size(max = 255)
    private String fullAddress;

    // Ubicación del local (si aplica).
    @Size(max = 255)
    private String location;

    // Coordenadas geocodificadas de la ubicación.
    private Double latitude;
    private Double longitude;

    // Define si tiene local o es a domicilio.
    @NotBlank
    @Pattern(regexp = "^(?i)(LOCAL|A_DOMICILIO|SIN_LOCAL)$")
    private String tipoCliente;

    // Contraseña en texto plano (se hashea al persistir).
    @NotBlank
    @Size(min = 8, max = 100)
    private String password;
}
