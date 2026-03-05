package com.plura.plurabackend.cache;

import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class InMemorySlotCacheService implements SlotCacheService {

    private static final Duration SLOTS_TTL = Duration.ofMinutes(5);

    private final ConcurrentHashMap<String, CacheEntry<List<String>>> slotCache = new ConcurrentHashMap<>();

    @Override
    public Optional<List<String>> getSlots(String key) {
        CacheEntry<List<String>> entry = slotCache.get(key);
        if (entry == null) {
            return Optional.empty();
        }
        if (entry.expiresAtEpochMillis < System.currentTimeMillis()) {
            slotCache.remove(key, entry);
            return Optional.empty();
        }
        return Optional.of(entry.value);
    }

    @Override
    public void putSlots(String key, List<String> slots) {
        if (key == null || key.isBlank() || slots == null) {
            return;
        }
        slotCache.put(
            key,
            new CacheEntry<>(List.copyOf(slots), System.currentTimeMillis() + SLOTS_TTL.toMillis())
        );
    }

    @Override
    public void evictByPrefix(String keyPrefix) {
        if (keyPrefix == null || keyPrefix.isBlank()) {
            return;
        }
        slotCache.keySet().removeIf(key -> key.startsWith(keyPrefix));
    }

    private record CacheEntry<T>(T value, long expiresAtEpochMillis) {}
}
