package com.plura.plurabackend.core.cache;

import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.cache.redis.RedisJsonCacheAdapter;
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
public class SlotCacheServiceFacade implements SlotCacheService {

    private static final Duration SLOTS_TTL = Duration.ofMinutes(5);

    private final InMemorySlotCacheService inMemory;
    private final RedisJsonCacheAdapter redis;
    private final MeterRegistry meterRegistry;
    private final JavaType stringListType;
    private final boolean cacheEnabled;
    private final boolean slotsCacheEnabled;

    public SlotCacheServiceFacade(
        InMemorySlotCacheService inMemory,
        RedisJsonCacheAdapter redis,
        MeterRegistry meterRegistry,
        ObjectMapper objectMapper,
        @Value("${cache.enabled:false}") boolean cacheEnabled,
        @Value("${feature.cache.slots-enabled:false}") boolean slotsCacheEnabled
    ) {
        this.inMemory = inMemory;
        this.redis = redis;
        this.meterRegistry = meterRegistry;
        this.stringListType = objectMapper.getTypeFactory().constructCollectionType(List.class, String.class);
        this.cacheEnabled = cacheEnabled;
        this.slotsCacheEnabled = slotsCacheEnabled;
    }

    @Override
    public Optional<List<String>> getSlots(String key) {
        if (!isSlotsCacheActive()) {
            return Optional.empty();
        }
        Optional<List<String>> memoryValue = inMemory.getSlots(key);
        if (memoryValue.isPresent()) {
            markHit("slots", "memory");
            return memoryValue;
        }
        Optional<List<String>> redisValue = redis.get(key, stringListType, "slots");
        if (redisValue.isPresent()) {
            inMemory.putSlots(key, redisValue.get());
            markHit("slots", "redis");
            return redisValue;
        }
        markMiss("slots");
        return Optional.empty();
    }

    @Override
    public void putSlots(String key, List<String> slots) {
        if (!isSlotsCacheActive()) {
            return;
        }
        inMemory.putSlots(key, slots);
        redis.put(key, slots, SLOTS_TTL, "slots");
    }

    @Override
    public void evictByPrefix(String keyPrefix) {
        if (!isSlotsCacheActive()) {
            return;
        }
        inMemory.evictByPrefix(keyPrefix);
        redis.evictByPrefix(keyPrefix, "slots");
    }

    private boolean isSlotsCacheActive() {
        return cacheEnabled && slotsCacheEnabled;
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
