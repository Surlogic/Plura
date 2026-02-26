package com.plura.plurabackend.professional.dto;

import lombok.Data;

@Data
public class ProfesionalBusinessProfileUpdateRequest {
    private String fullName;
    private String rubro;
    private String location;
    private String phoneNumber;
}
