package com.plura.plurabackend.core.cache;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * InMemorySlotCacheService es un servicio de negocio del modulo cache.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: servicios, cache.
 */
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

    /**
     * Ejecuta la logica de put slots manteniendola encapsulada en este componente.
     */
    @Override
    public void putSlots(String key, List<String> slots) {
        if (key == null || key.isBlank() || slots == null) {
            return;
        }
        slotCache.put(key, List.copyOf(slots));
    }

    /**
     * Ejecuta la logica de evict by prefix manteniendola encapsulada en este componente.
     */
    @Override
    public void evictByPrefix(String keyPrefix) {
        if (keyPrefix == null || keyPrefix.isBlank()) {
            return;
        }
        slotCache.asMap().keySet().removeIf(key -> key.startsWith(keyPrefix));
    }
}
