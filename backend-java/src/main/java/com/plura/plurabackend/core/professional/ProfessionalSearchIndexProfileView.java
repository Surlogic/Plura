package com.plura.plurabackend.core.professional;

import java.util.List;

/**
 * ProfessionalSearchIndexProfileView es un modelo inmutable del modulo profesionales.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: profesionales, perfiles, busqueda.
 */
public record ProfessionalSearchIndexProfileView(
    Long professionalId,
    String slug,
    String displayName,
    String publicHeadline,
    String locationText,
    List<String> categorySlugs,
    Double rating,
    Double latitude,
    Double longitude,
    Boolean hasAvailabilityToday
) {}
