package com.plura.plurabackend.core.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.Data;

/**
 * DTO de solicitud para registrar un nuevo profesional en la plataforma.
 * Contiene todos los datos necesarios para crear la cuenta profesional,
 * incluyendo informacion personal, de negocio y ubicacion.
 */
@Data
public class RegisterProfesionalRequest {

    /** Nombre visible del profesional o empresa. */
    @NotBlank
    @Size(min = 2, max = 120)
    private String fullName;

    /** Rubro o categoria principal del negocio. */
    private String rubro;

    /** Slugs de las categorias de servicios seleccionadas. */
    private List<String> categorySlugs;

    /** Email unico usado como identificador de la cuenta. */
    @NotBlank
    @Email
    @Size(max = 255)
    private String email;

    /** Telefono de contacto del profesional. */
    @NotBlank
    @Size(max = 30)
    @Pattern(regexp = "^[+0-9()\\-\\s]{3,30}$")
    private String phoneNumber;

    /** Pais donde opera el negocio. */
    @NotBlank
    @Size(max = 80)
    private String country;

    /** Ciudad donde opera el negocio. */
    @NotBlank
    @Size(max = 120)
    private String city;

    /** Direccion completa del negocio. */
    @NotBlank
    @Size(max = 255)
    private String fullAddress;

    /** Ubicacion o nombre del local (si aplica). */
    @Size(max = 255)
    private String location;

    /** Latitud de la ubicacion geocodificada. */
    private Double latitude;
    /** Longitud de la ubicacion geocodificada. */
    private Double longitude;

    /** Tipo de cliente: LOCAL, A_DOMICILIO o SIN_LOCAL. */
    @NotBlank
    @Pattern(regexp = "^(?i)(LOCAL|A_DOMICILIO|SIN_LOCAL)$")
    private String tipoCliente;

    /** Contrasena en texto plano (se hashea al persistir). */
    @NotBlank
    @Size(min = 8, max = 100)
    private String password;
}
