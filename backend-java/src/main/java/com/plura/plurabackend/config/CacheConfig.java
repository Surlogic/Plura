package com.plura.plurabackend.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import java.util.concurrent.TimeUnit;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * CacheConfig es un configuracion Spring del modulo configuracion.
 * Responsabilidad: declarar beans, filtros o parametros transversales que necesita el runtime.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: cache.
 */
@Configuration
@EnableCaching
public class CacheConfig {

    @Value("${APP_CACHE_TTL_MINUTES:10}")
    private long cacheTtlMinutes;

    @Value("${APP_CACHE_MAX_SIZE:1000}")
    private long cacheMaximumSize;

    /**
     * Ejecuta la logica de cache manager manteniendola encapsulada en este componente.
     */
    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager("homeData", "activeCategories");
        manager.setCaffeine(Caffeine.newBuilder()
            .expireAfterWrite(Math.max(1, cacheTtlMinutes), TimeUnit.MINUTES)
            .maximumSize(Math.max(100, cacheMaximumSize)));
        return manager;
    }
}
