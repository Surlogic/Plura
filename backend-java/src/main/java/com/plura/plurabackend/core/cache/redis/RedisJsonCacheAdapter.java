package com.plura.plurabackend.core.cache.redis;

import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.lang.Nullable;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.stereotype.Component;

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
                String pattern = prefix + "*";
                RedisCallback<Long> scanDelete = connection -> scanAndDeleteByPattern(connection, pattern);
                redisTemplate.get().execute(scanDelete);
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

    private long scanAndDeleteByPattern(RedisConnection connection, String pattern) {
        if (connection == null || pattern == null || pattern.isBlank()) {
            return 0L;
        }
        long deleted = 0L;
        final int batchSize = 500;
        ScanOptions options = ScanOptions.scanOptions().match(pattern).count(batchSize).build();
        List<byte[]> keysBatch = new ArrayList<>(batchSize);
        try (Cursor<byte[]> cursor = connection.scan(options)) {
            while (cursor.hasNext()) {
                byte[] key = cursor.next();
                if (key == null || key.length == 0) {
                    continue;
                }
                keysBatch.add(key);
                if (keysBatch.size() >= batchSize) {
                    deleted += deleteBatch(connection, keysBatch);
                    keysBatch.clear();
                }
            }
            if (!keysBatch.isEmpty()) {
                deleted += deleteBatch(connection, keysBatch);
            }
        }
        return deleted;
    }

    private long deleteBatch(RedisConnection connection, List<byte[]> keysBatch) {
        if (keysBatch.isEmpty()) {
            return 0L;
        }
        byte[][] keys = keysBatch.toArray(new byte[0][]);
        Long unlinked = null;
        try {
            unlinked = connection.keyCommands().unlink(keys);
        } catch (RuntimeException ignored) {
            // Fallback a DEL si UNLINK no está soportado por la versión de Redis.
        }
        if (unlinked != null) {
            return unlinked;
        }
        return connection.del(keys);
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
