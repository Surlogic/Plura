package com.plura.plurabackend.core.professional;

import com.plura.plurabackend.professional.dto.MediaPresentationDto;

public record ProfessionalHomeProfileView(
    Long professionalId,
    String slug,
    String displayName,
    String primaryCategoryName,
    Double rating,
    Integer reviewsCount,
    String imageUrl,
    String bannerUrl,
    MediaPresentationDto bannerMedia,
    String logoUrl,
    MediaPresentationDto logoMedia,
    String fallbackPhotoUrl
) {}
