package com.plura.plurabackend.cache;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class InMemorySlotCacheService implements SlotCacheService {

    private static final Duration SLOTS_TTL = Duration.ofMinutes(5);

    private final Cache<String, List<String>> slotCache;

    public InMemorySlotCacheService(@Value("${app.cache.slots.max-size:30000}") long slotsMaxSize) {
        this.slotCache = Caffeine.newBuilder()
            .expireAfterWrite(SLOTS_TTL)
            .maximumSize(Math.max(1000L, slotsMaxSize))
            .build();
    }

    @Override
    public Optional<List<String>> getSlots(String key) {
        if (key == null || key.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(slotCache.getIfPresent(key));
    }

    @Override
    public void putSlots(String key, List<String> slots) {
        if (key == null || key.isBlank() || slots == null) {
            return;
        }
        slotCache.put(key, List.copyOf(slots));
    }

    @Override
    public void evictByPrefix(String keyPrefix) {
        if (keyPrefix == null || keyPrefix.isBlank()) {
            return;
        }
        slotCache.asMap().keySet().removeIf(key -> key.startsWith(keyPrefix));
    }
}
