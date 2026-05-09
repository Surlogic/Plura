package com.plura.plurabackend.core.cache;

import java.util.List;
import java.util.Optional;

/**
 * SlotCacheService es un contrato interno del modulo cache.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: servicios, cache.
 */
public interface SlotCacheService {
    Optional<List<String>> getSlots(String key);

    void putSlots(String key, List<String> slots);

    void evictByPrefix(String keyPrefix);
}
