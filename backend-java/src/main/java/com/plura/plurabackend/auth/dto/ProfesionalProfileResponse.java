package com.plura.plurabackend.auth.dto;

import com.plura.plurabackend.category.dto.CategoryResponse;
import com.plura.plurabackend.productplan.ProductPlanCapabilities;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ProfesionalProfileResponse {
    private String id;
    private String slug;
    private String fullName;
    private String email;
    private String phoneNumber;
    private String rubro;
    private String location;
    private String country;
    private String city;
    private String fullAddress;
    private Double latitude;
    private Double longitude;
    private String tipoCliente;
    private String logoUrl;
    private String instagram;
    private String facebook;
    private String tiktok;
    private String website;
    private String whatsapp;
    private String publicHeadline;
    private String publicAbout;
    private List<String> publicPhotos;
    private List<CategoryResponse> categories;
    private String planCode;
    private ProductPlanCapabilities planCapabilities;
    private LocalDateTime createdAt;
}
