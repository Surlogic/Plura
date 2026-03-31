package com.plura.plurabackend.storage;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.plura.plurabackend.core.storage.CloudflareR2ImageStorageService;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;

class CloudflareR2ImageStorageServiceTest {

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
