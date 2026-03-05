package com.plura.plurabackend.cache;

import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.cache.redis.RedisJsonCacheAdapter;
import com.plura.plurabackend.professional.dto.ProfesionalPublicPageResponse;
import com.plura.plurabackend.professional.dto.ProfesionalPublicSummaryResponse;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

@Service
@Primary
public class ProfileCacheServiceFacade implements ProfileCacheService {

    private static final Duration PROFILE_PAGE_TTL = Duration.ofMinutes(5);
    private static final Duration SUMMARY_TTL = Duration.ofMinutes(2);
    private static final String SUMMARY_PREFIX = "public-summaries:";

    private final InMemoryProfileCacheService inMemory;
    private final RedisJsonCacheAdapter redis;
    private final MeterRegistry meterRegistry;
    private final JavaType summaryListType;
    private final boolean cacheEnabled;
    private final boolean profileCacheEnabled;

    public ProfileCacheServiceFacade(
        InMemoryProfileCacheService inMemory,
        RedisJsonCacheAdapter redis,
        MeterRegistry meterRegistry,
        ObjectMapper objectMapper,
        @Value("${cache.enabled:false}") boolean cacheEnabled,
        @Value("${feature.cache.profile-enabled:false}") boolean profileCacheEnabled
    ) {
        this.inMemory = inMemory;
        this.redis = redis;
        this.meterRegistry = meterRegistry;
        this.summaryListType = objectMapper.getTypeFactory().constructCollectionType(
            List.class,
            ProfesionalPublicSummaryResponse.class
        );
        this.cacheEnabled = cacheEnabled;
        this.profileCacheEnabled = profileCacheEnabled;
    }

    @Override
    public Optional<ProfesionalPublicPageResponse> getPublicPageBySlug(String slug) {
        if (!isProfileCacheActive()) {
            return Optional.empty();
        }
        Optional<ProfesionalPublicPageResponse> memoryValue = inMemory.getPublicPageBySlug(slug);
        if (memoryValue.isPresent()) {
            markHit("profile-page", "memory");
            return memoryValue;
        }

        String key = "profile:" + normalize(slug);
        Optional<ProfesionalPublicPageResponse> redisValue = redis.get(
            key,
            ProfesionalPublicPageResponse.class,
            "profile-page"
        );
        if (redisValue.isPresent()) {
            inMemory.putPublicPageBySlug(slug, redisValue.get());
            markHit("profile-page", "redis");
            return redisValue;
        }

        markMiss("profile-page");
        return Optional.empty();
    }

    @Override
    public void putPublicPageBySlug(String slug, ProfesionalPublicPageResponse response) {
        if (!isProfileCacheActive()) {
            return;
        }
        inMemory.putPublicPageBySlug(slug, response);
        redis.put("profile:" + normalize(slug), response, PROFILE_PAGE_TTL, "profile-page");
    }

    @Override
    public Optional<List<ProfesionalPublicSummaryResponse>> getPublicSummaries(String key) {
        if (!isProfileCacheActive()) {
            return Optional.empty();
        }
        Optional<List<ProfesionalPublicSummaryResponse>> memoryValue = inMemory.getPublicSummaries(key);
        if (memoryValue.isPresent()) {
            markHit("profile-summaries", "memory");
            return memoryValue;
        }

        String redisKey = SUMMARY_PREFIX + normalize(key);
        Optional<List<ProfesionalPublicSummaryResponse>> redisValue = redis.get(
            redisKey,
            summaryListType,
            "profile-summaries"
        );
        if (redisValue.isPresent()) {
            inMemory.putPublicSummaries(key, redisValue.get());
            markHit("profile-summaries", "redis");
            return redisValue;
        }

        markMiss("profile-summaries");
        return Optional.empty();
    }

    @Override
    public void putPublicSummaries(String key, List<ProfesionalPublicSummaryResponse> response) {
        if (!isProfileCacheActive()) {
            return;
        }
        inMemory.putPublicSummaries(key, response);
        redis.put(SUMMARY_PREFIX + normalize(key), response, SUMMARY_TTL, "profile-summaries");
    }

    @Override
    public void evictPublicPageBySlug(String slug) {
        if (!isProfileCacheActive()) {
            return;
        }
        inMemory.evictPublicPageBySlug(slug);
        redis.evict("profile:" + normalize(slug), "profile-page");
    }

    @Override
    public void evictPublicSummaries() {
        if (!isProfileCacheActive()) {
            return;
        }
        inMemory.evictPublicSummaries();
        redis.evictByPrefix(SUMMARY_PREFIX, "profile-summaries");
    }

    private boolean isProfileCacheActive() {
        return cacheEnabled && profileCacheEnabled;
    }

    private String normalize(String key) {
        return key == null ? "" : key.trim().toLowerCase();
    }

    private void markHit(String cacheName, String backend) {
        Counter.builder("plura.cache.hit")
            .description("Cache hits")
            .tag("cache", cacheName)
            .tag("backend", backend)
            .register(meterRegistry)
            .increment();
    }

    private void markMiss(String cacheName) {
        Counter.builder("plura.cache.miss")
            .description("Cache misses")
            .tag("cache", cacheName)
            .register(meterRegistry)
            .increment();
    }
}
