package com.plura.plurabackend.profesional.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ProfesionalPublicPageResponse {
    private String id;
    private String slug;
    private String fullName;
    private String rubro;
    private String headline;
    private String about;
    private String location;
    private String email;
    private String phoneNumber;
    private List<String> photos;
    private List<ProfesionalServiceResponse> services;
}
