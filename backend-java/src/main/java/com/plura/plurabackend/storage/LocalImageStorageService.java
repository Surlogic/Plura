package com.plura.plurabackend.storage;

import java.nio.file.Files;
import java.nio.file.Path;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnExpression("'${app.storage.provider:local}'.equalsIgnoreCase('local')")
public class LocalImageStorageService implements ImageStorageService {

    private static final Logger LOGGER = LoggerFactory.getLogger(LocalImageStorageService.class);

    private final String publicBaseUrl;
    private final Path localBaseDir;
    private final MeterRegistry meterRegistry;

    public LocalImageStorageService(
        @Value("${app.storage.public-base-url:/uploads}") String publicBaseUrl,
        @Value("${app.storage.local-base-dir:./uploads}") String localBaseDir,
        MeterRegistry meterRegistry
    ) {
        this.publicBaseUrl = normalizeBase(publicBaseUrl);
        this.localBaseDir = Path.of(localBaseDir).toAbsolutePath().normalize();
        this.meterRegistry = meterRegistry;
        try {
            Files.createDirectories(this.localBaseDir);
        } catch (Exception exception) {
            LOGGER.warn("No se pudo crear directorio de uploads local {}", this.localBaseDir, exception);
        }
    }

    @Override
    public String generateUploadUrl(String objectKey) {
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            return this.publicBaseUrl + "/upload/" + sanitizeKey(objectKey);
        } finally {
            sample.stop(
                Timer.builder("plura.image.upload_url.latency")
                    .description("Image upload URL generation latency")
                    .tag("provider", "local")
                    .register(meterRegistry)
            );
        }
    }

    @Override
    public String generatePublicUrl(String objectKey) {
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            if (objectKey == null || objectKey.isBlank()) {
                return this.publicBaseUrl + "/missing";
            }
            String trimmed = objectKey.trim();
            if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) {
                return trimmed;
            }
            boolean r2UriReference = trimmed.startsWith("r2://");
            boolean r2KeyReference = trimmed.startsWith("r2:");
            String normalized = trimmed;
            if (r2UriReference) {
                normalized = trimmed.substring("r2://".length()).replaceFirst("^/+", "");
                int slash = normalized.indexOf('/');
                if (slash >= 0) {
                    normalized = normalized.substring(slash + 1);
                }
            } else if (r2KeyReference) {
                normalized = trimmed.substring("r2:".length()).replaceFirst("^/+", "");
            }
            return this.publicBaseUrl + "/" + sanitizeKey(normalized);
        } finally {
            sample.stop(
                Timer.builder("plura.image.public_url.generate.latency")
                    .description("Image public URL generation latency")
                    .tag("provider", "local")
                    .register(meterRegistry)
            );
        }
    }

    private String sanitizeKey(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            return "missing";
        }
        return objectKey.trim().replace("..", "").replace('\\', '/');
    }

    private String normalizeBase(String baseUrl) {
        String value = baseUrl == null || baseUrl.isBlank() ? "/uploads" : baseUrl.trim();
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
