package com.plura.plurabackend.cache;

import java.util.List;
import java.util.Optional;

public interface SlotCacheService {
    Optional<List<String>> getSlots(String key);

    void putSlots(String key, List<String> slots);

    void evictByPrefix(String keyPrefix);
}
