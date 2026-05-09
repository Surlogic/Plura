package com.plura.plurabackend.core.cache;

import com.plura.plurabackend.professional.dto.ProfesionalPublicPageResponse;
import com.plura.plurabackend.professional.dto.ProfesionalPublicSummaryResponse;
import java.util.List;
import java.util.Optional;

/**
 * ProfileCacheService es un contrato interno del modulo cache.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: perfiles, servicios, cache.
 */
public interface ProfileCacheService {
    Optional<ProfesionalPublicPageResponse> getPublicPageBySlug(String slug);

    void putPublicPageBySlug(String slug, ProfesionalPublicPageResponse response);

    Optional<List<ProfesionalPublicSummaryResponse>> getPublicSummaries(String key);

    void putPublicSummaries(String key, List<ProfesionalPublicSummaryResponse> response);

    void evictPublicPageBySlug(String slug);

    void evictPublicSummaries();
}
