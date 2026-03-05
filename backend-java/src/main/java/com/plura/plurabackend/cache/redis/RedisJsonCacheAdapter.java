package com.plura.plurabackend.cache.redis;

import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.time.Duration;
import java.util.Optional;
import java.util.Set;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;
import org.springframework.data.redis.core.StringRedisTemplate;

@Component
public class RedisJsonCacheAdapter {

    private static final Logger LOGGER = LoggerFactory.getLogger(RedisJsonCacheAdapter.class);

    private final ObjectMapper objectMapper;
    private final Optional<StringRedisTemplate> redisTemplate;
    private final MeterRegistry meterRegistry;
    private final RedisCacheProperties redisCacheProperties;
    private final boolean cacheEnabled;
    private final boolean redisEnabled;

    public RedisJsonCacheAdapter(
        ObjectMapper objectMapper,
        Optional<StringRedisTemplate> redisTemplate,
        MeterRegistry meterRegistry,
        RedisCacheProperties redisCacheProperties,
        @Value("${cache.enabled:false}") boolean cacheEnabled,
        @Value("${redis.enabled:false}") boolean redisEnabled
    ) {
        this.objectMapper = objectMapper;
        this.redisTemplate = redisTemplate;
        this.meterRegistry = meterRegistry;
        this.redisCacheProperties = redisCacheProperties;
        this.cacheEnabled = cacheEnabled;
        this.redisEnabled = redisEnabled;
    }

    public boolean isRedisUsable() {
        return cacheEnabled && redisEnabled && redisTemplate.isPresent();
    }

    public <T> Optional<T> get(String key, Class<T> type, String cacheName) {
        return getInternal(key, cacheName, () -> {
            String raw = redisTemplate.get().opsForValue().get(key);
            if (raw == null || raw.isBlank()) {
                return Optional.<T>empty();
            }
            try {
                return Optional.of(objectMapper.readValue(raw, type));
            } catch (Exception exception) {
                throw new IllegalStateException("No se pudo deserializar cache " + cacheName, exception);
            }
        });
    }

    public <T> Optional<T> get(String key, JavaType type, String cacheName) {
        return getInternal(key, cacheName, () -> {
            String raw = redisTemplate.get().opsForValue().get(key);
            if (raw == null || raw.isBlank()) {
                return Optional.<T>empty();
            }
            try {
                return Optional.of(objectMapper.readValue(raw, type));
            } catch (Exception exception) {
                throw new IllegalStateException("No se pudo deserializar cache " + cacheName, exception);
            }
        });
    }

    public void put(String key, Object value, @Nullable Duration ttl, String cacheName) {
        if (!isRedisUsable() || key == null || key.isBlank() || value == null) {
            return;
        }
        Duration effectiveTtl = resolveTtl(ttl);
        try {
            executeWithMetrics("set", cacheName, () -> {
                try {
                    String payload = objectMapper.writeValueAsString(value);
                    redisTemplate.get().opsForValue().set(key, payload, effectiveTtl);
                    return null;
                } catch (Exception exception) {
                    throw new IllegalStateException("No se pudo serializar cache " + cacheName, exception);
                }
            });
        } catch (RuntimeException ignored) {
            // Fallback a memoria manejado por capas superiores.
        }
    }

    public void evict(String key, String cacheName) {
        if (!isRedisUsable() || key == null || key.isBlank()) {
            return;
        }
        try {
            executeWithMetrics("evict", cacheName, () -> {
                redisTemplate.get().delete(key);
                return null;
            });
        } catch (RuntimeException ignored) {
            // Fallback a memoria manejado por capas superiores.
        }
    }

    public void evictByPrefix(String prefix, String cacheName) {
        if (!isRedisUsable() || prefix == null || prefix.isBlank()) {
            return;
        }
        try {
            executeWithMetrics("evict-prefix", cacheName, () -> {
                Set<String> keys = redisTemplate.get().keys(prefix + "*");
                if (keys != null && !keys.isEmpty()) {
                    redisTemplate.get().delete(keys);
                }
                return null;
            });
        } catch (RuntimeException ignored) {
            // Fallback a memoria manejado por capas superiores.
        }
    }

    private <T> Optional<T> getInternal(String key, String cacheName, Supplier<Optional<T>> action) {
        if (!isRedisUsable() || key == null || key.isBlank()) {
            return Optional.empty();
        }
        try {
            return executeWithMetrics("get", cacheName, action);
        } catch (RuntimeException ignored) {
            return Optional.empty();
        }
    }

    private Duration resolveTtl(@Nullable Duration ttl) {
        if (ttl != null && !ttl.isNegative() && !ttl.isZero()) {
            return ttl;
        }
        long seconds = Math.max(1L, redisCacheProperties.getTtlSeconds());
        return Duration.ofSeconds(seconds);
    }

    private <T> T executeWithMetrics(String operation, String cacheName, Supplier<T> action) {
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            return action.get();
        } catch (RuntimeException exception) {
            Counter.builder("plura.redis.errors")
                .tag("operation", operation)
                .tag("cache", cacheName)
                .register(meterRegistry)
                .increment();
            LOGGER.warn("Redis {} failed for cache {}", operation, cacheName, exception);
            throw exception;
        } finally {
            sample.stop(
                Timer.builder("plura.redis.latency")
                    .description("Redis operation latency")
                    .tag("operation", operation)
                    .tag("cache", cacheName)
                    .register(meterRegistry)
            );
        }
    }
}
