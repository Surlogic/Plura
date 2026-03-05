package com.plura.plurabackend.professional.dto;

import com.plura.plurabackend.category.dto.CategoryResponse;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDto;
import com.plura.plurabackend.professional.service.dto.ProfesionalServiceResponse;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ProfesionalPublicPageResponse {
    private String id;
    private String slug;
    private String name;
    private String fullName;
    private String rubro;
    private String description;
    private String headline;
    private String about;
    private String logoUrl;
    private String address;
    private String location;
    private Double lat;
    private Double lng;
    private Double latitude;
    private Double longitude;
    private String email;
    private String phone;
    private String phoneNumber;
    private String instagram;
    private String facebook;
    private String tiktok;
    private String website;
    private String whatsapp;
    private List<CategoryResponse> categories;
    private List<String> photos;
    private ProfesionalScheduleDto schedule;
    private List<ProfesionalServiceResponse> services;
}
