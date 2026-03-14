package com.plura.plurabackend.core.storage;

import static org.junit.jupiter.api.Assertions.assertEquals;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;

class LocalImageStorageServiceTest {

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
    }
}
