package com.plura.plurabackend.core.professional;

import com.plura.plurabackend.core.category.dto.CategoryResponse;
import java.util.List;

/**
 * ProfessionalPublicSummary es un modelo inmutable del modulo profesionales.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: profesionales, superficie publica.
 */
public record ProfessionalPublicSummary(
    Long professionalId,
    String slug,
    String fullName,
    String rubro,
    String location,
    String publicHeadline,
    List<CategoryResponse> categories,
    String logoUrl,
    Double rating,
    Integer reviewsCount
) {}
