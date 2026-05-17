package com.plura.plurabackend.core.auth.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.Data;

@Data
public class ActivateProfessionalProfileRequest {

    private String rubro;

    private List<String> categorySlugs;

    @Size(max = 80)
    private String country;

    @Size(max = 120)
    private String city;

    @Size(max = 255)
    private String fullAddress;

    @Size(max = 255)
    private String location;

    private Double latitude;

    private Double longitude;

    @NotBlank
    @Pattern(regexp = "^(?i)(LOCAL|A_DOMICILIO|SIN_LOCAL)$")
    private String tipoCliente;
}
