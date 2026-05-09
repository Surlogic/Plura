package com.plura.plurabackend.core.professional;

import com.plura.plurabackend.professional.dto.MediaPresentationDto;

/**
 * ProfessionalHomeProfileView es un modelo inmutable del modulo profesionales.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: profesionales, perfiles, home publica.
 */
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
