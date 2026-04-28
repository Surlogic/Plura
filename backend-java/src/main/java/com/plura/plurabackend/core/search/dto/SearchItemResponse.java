package com.plura.plurabackend.core.search.dto;

import com.plura.plurabackend.professional.dto.MediaPresentationDto;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SearchItemResponse {
    private String id;
    private String slug;
    private String name;
    private String professionalName;
    private String businessName;
    private String resultKind;
    private String headline;
    private Double rating;
    private Integer reviewsCount;
    private List<String> categorySlugs;
    private Double distanceKm;
    private Double latitude;
    private Double longitude;
    private Double priceFrom;
    private String coverImageUrl;
    private String bannerUrl;
    private MediaPresentationDto bannerMedia;
    private String logoUrl;
    private MediaPresentationDto logoMedia;
    private String fallbackPhotoUrl;
    private String locationText;
}
