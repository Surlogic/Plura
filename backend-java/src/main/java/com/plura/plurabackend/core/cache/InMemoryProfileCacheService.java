package com.plura.plurabackend.core.cache;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.plura.plurabackend.professional.dto.ProfesionalPublicPageResponse;
import com.plura.plurabackend.professional.dto.ProfesionalPublicSummaryResponse;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class InMemoryProfileCacheService implements ProfileCacheService {

    private static final Duration PAGE_TTL = Duration.ofMinutes(10);
    private static final Duration SUMMARIES_TTL = Duration.ofMinutes(10);

    private final Cache<String, ProfesionalPublicPageResponse> pageCache;
    private final Cache<String, List<ProfesionalPublicSummaryResponse>> summaryCache;

    public InMemoryProfileCacheService(
        @Value("${app.cache.profile.page-max-size:10000}") long pageMaxSize,
        @Value("${app.cache.profile.summaries-max-size:5000}") long summariesMaxSize
    ) {
        this.pageCache = Caffeine.newBuilder()
            .expireAfterWrite(PAGE_TTL)
            .maximumSize(Math.max(500L, pageMaxSize))
            .build();
        this.summaryCache = Caffeine.newBuilder()
            .expireAfterWrite(SUMMARIES_TTL)
            .maximumSize(Math.max(200L, summariesMaxSize))
            .build();
    }

    @Override
    public Optional<ProfesionalPublicPageResponse> getPublicPageBySlug(String slug) {
        if (slug == null || slug.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(pageCache.getIfPresent(slug));
    }

    @Override
    public void putPublicPageBySlug(String slug, ProfesionalPublicPageResponse response) {
        if (slug == null || slug.isBlank() || response == null) {
            return;
        }
        pageCache.put(slug, response);
    }

    @Override
    public Optional<List<ProfesionalPublicSummaryResponse>> getPublicSummaries(String key) {
        if (key == null || key.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(summaryCache.getIfPresent(key));
    }

    @Override
    public void putPublicSummaries(String key, List<ProfesionalPublicSummaryResponse> response) {
        if (key == null || key.isBlank() || response == null) {
            return;
        }
        summaryCache.put(key, List.copyOf(response));
    }

    @Override
    public void evictPublicPageBySlug(String slug) {
        if (slug == null || slug.isBlank()) {
            return;
        }
        pageCache.invalidate(slug);
    }

    @Override
    public void evictPublicSummaries() {
        summaryCache.invalidateAll();
    }
}
