package com.plura.plurabackend.professional.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.Data;

@Data
public class ProfesionalBusinessProfileUpdateRequest {
    @Size(min = 2, max = 120)
    private String fullName;

    @Size(max = 120)
    private String rubro;

    @Size(max = 10)
    private List<@Size(max = 120) String> categorySlugs;

    @Size(max = 255)
    private String location;

    private Double latitude;
    private Double longitude;

    @Size(max = 30)
    @Pattern(regexp = "^[+0-9()\\-\\s]{3,30}$")
    private String phoneNumber;

    @Pattern(regexp = "^(https?://.+|r2://.+|r2:.+)$")
    private String logoUrl;

    @Size(max = 255)
    private String instagram;

    @Size(max = 255)
    private String facebook;

    @Size(max = 255)
    private String tiktok;

    @Size(max = 255)
    private String website;

    @Size(max = 255)
    private String whatsapp;
}
