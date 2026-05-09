package com.plura.plurabackend.core.professional;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;

/**
 * ProfessionalPublicReadFacade es un contrato interno del modulo profesionales.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: profesionales, superficie publica.
 */
public interface ProfessionalPublicReadFacade {

    Optional<ProfessionalPublicSummary> findActiveSummaryBySlug(String slug);

    Map<Long, ProfessionalPublicSummary> findActiveSummariesByIds(Collection<Long> ids);

    Optional<Long> findActiveProfessionalIdBySlug(String slug);
}
