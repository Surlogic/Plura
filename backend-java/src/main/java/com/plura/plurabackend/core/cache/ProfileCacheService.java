package com.plura.plurabackend.core.cache;

import com.plura.plurabackend.professional.dto.ProfesionalPublicPageResponse;
import com.plura.plurabackend.professional.dto.ProfesionalPublicSummaryResponse;
import java.util.List;
import java.util.Optional;

public interface ProfileCacheService {
    Optional<ProfesionalPublicPageResponse> getPublicPageBySlug(String slug);

    void putPublicPageBySlug(String slug, ProfesionalPublicPageResponse response);

    Optional<List<ProfesionalPublicSummaryResponse>> getPublicSummaries(String key);

    void putPublicSummaries(String key, List<ProfesionalPublicSummaryResponse> response);

    void evictPublicPageBySlug(String slug);

    void evictPublicSummaries();
}
