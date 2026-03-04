package com.plura.plurabackend.professional.dto;

import java.util.List;
import lombok.Data;

@Data
public class ProfesionalBusinessProfileUpdateRequest {
    private String fullName;
    private String rubro;
    private List<String> categorySlugs;
    private String location;
    private Double latitude;
    private Double longitude;
    private String phoneNumber;
    private String logoUrl;
}
