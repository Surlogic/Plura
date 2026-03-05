package com.plura.plurabackend.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import java.util.concurrent.TimeUnit;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableCaching
public class CacheConfig {

    @Value("${APP_CACHE_TTL_MINUTES:5}")
    private long cacheTtlMinutes;

    @Value("${APP_CACHE_MAX_SIZE:1000}")
    private long cacheMaximumSize;

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager("homeData", "activeCategories");
        manager.setCaffeine(Caffeine.newBuilder()
            .expireAfterWrite(Math.max(1, cacheTtlMinutes), TimeUnit.MINUTES)
            .maximumSize(Math.max(100, cacheMaximumSize)));
        return manager;
    }
}
