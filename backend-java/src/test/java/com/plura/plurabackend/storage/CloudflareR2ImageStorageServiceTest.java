package com.plura.plurabackend.storage;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.plura.plurabackend.core.storage.CloudflareR2ImageStorageService;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;

/**
 * Tests de storage.
 * Cubren escenarios de cloudflare 2 imagen storage servicio para documentar el comportamiento esperado y evitar regresiones.
 * Mantener estos casos alineados con los contratos reales del backend cuando cambie la logica productiva.
 */
class CloudflareR2ImageStorageServiceTest {

    /**
     * Escenario: debe canonicalize managed publico urls a storage uris.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void shouldCanonicalizeManagedPublicUrlsToStorageUris() {
        CloudflareR2ImageStorageService storageService = new CloudflareR2ImageStorageService(
            "https://example-account.r2.cloudflarestorage.com",
            "plura-images",
            "https://img.surlogicuy.com",
            "auto",
            "test-key",
            "test-secret",
            5_242_880L,
            10L,
            "image/jpeg,image/png,image/webp,image/avif",
            new SimpleMeterRegistry()
        );

        assertEquals(
            "r2://plura-images/professionals/1/gallery/photo.jpg",
            storageService.normalizeStoredReference(
                "https://img.surlogicuy.com/professionals/1/gallery/photo.jpg?fit=cover"
            )
        );
        assertEquals(
            "https://external.example.com/photo.jpg",
            storageService.normalizeStoredReference("https://external.example.com/photo.jpg")
        );
    }
}
