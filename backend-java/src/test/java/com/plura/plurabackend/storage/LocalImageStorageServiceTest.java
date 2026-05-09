package com.plura.plurabackend.core.storage;

import static org.junit.jupiter.api.Assertions.assertEquals;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;

/**
 * Tests de storage.
 * Cubren escenarios de local imagen storage servicio para documentar el comportamiento esperado y evitar regresiones.
 * Mantener estos casos alineados con los contratos reales del backend cuando cambie la logica productiva.
 */
class LocalImageStorageServiceTest {

    /**
     * Escenario: debe resolve legacy http y 2 references.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void shouldResolveLegacyHttpAndR2References() {
        LocalImageStorageService storageService = new LocalImageStorageService(
            "/uploads",
            "./build/test-uploads",
            new SimpleMeterRegistry()
        );

        assertEquals(
            "https://legacy.example/image.jpg",
            storageService.generatePublicUrl("https://legacy.example/image.jpg")
        );
        assertEquals(
            "/uploads/profiles/photo.jpg",
            storageService.generatePublicUrl("r2://bucket/profiles/photo.jpg")
        );
        assertEquals(
            "/uploads/profiles/photo.jpg",
            storageService.generatePublicUrl("r2:profiles/photo.jpg")
        );
        assertEquals(
            "/uploads/profiles/photo.jpg",
            storageService.normalizeStoredReference("https://api.example.com/uploads/profiles/photo.jpg?version=1")
        );
    }
}
