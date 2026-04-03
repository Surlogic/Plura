package com.plura.plurabackend.core.home.dto;

import com.plura.plurabackend.professional.dto.MediaPresentationDto;
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
    private Integer reviewsCount;
    private String imageUrl;
    private String bannerUrl;
    private MediaPresentationDto bannerMedia;
    private String logoUrl;
    private MediaPresentationDto logoMedia;
    private String fallbackPhotoUrl;
}
