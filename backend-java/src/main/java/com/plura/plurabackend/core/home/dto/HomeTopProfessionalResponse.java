package com.plura.plurabackend.core.home.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class HomeTopProfessionalResponse {
    private String id;
    private String slug;
    private String name;
    private String category;
    private Double rating;
    private String imageUrl;
}
