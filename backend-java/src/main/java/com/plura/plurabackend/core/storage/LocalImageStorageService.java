package com.plura.plurabackend.core.storage;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
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
    public String normalizeStoredReference(String urlOrStorageKey) {
        if (urlOrStorageKey == null) {
            return null;
        }
        String trimmed = stripQueryAndFragment(urlOrStorageKey.trim());
        if (trimmed.isBlank()) {
            return null;
        }
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            String path = extractPath(trimmed);
            if (path.startsWith(publicBaseUrl + "/")) {
                return publicBaseUrl + "/" + sanitizeKey(path.substring(publicBaseUrl.length() + 1));
            }
            if (path.startsWith("/uploads/")) {
                return "/uploads/" + sanitizeKey(path.substring("/uploads/".length()));
            }
            return trimmed;
        }
        if (trimmed.startsWith(publicBaseUrl + "/")) {
            return publicBaseUrl + "/" + sanitizeKey(trimmed.substring(publicBaseUrl.length() + 1));
        }
        if (trimmed.startsWith("/uploads/")) {
            return "/uploads/" + sanitizeKey(trimmed.substring("/uploads/".length()));
        }
        return trimmed;
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

    @Override
    public String storeImage(byte[] bytes, String objectKey, String contentType) {
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            if (bytes == null || bytes.length == 0) {
                throw new IllegalArgumentException("Image bytes are required");
            }
            String normalizedKey = sanitizeKey(objectKey);
            Path targetFile = localBaseDir.resolve(normalizedKey).normalize();
            if (!targetFile.startsWith(localBaseDir)) {
                throw new IllegalArgumentException("Ruta de imagen inválida");
            }
            Path parent = targetFile.getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
            Files.write(
                targetFile,
                bytes,
                StandardOpenOption.CREATE,
                StandardOpenOption.TRUNCATE_EXISTING,
                StandardOpenOption.WRITE
            );
            return this.publicBaseUrl + "/" + normalizedKey;
        } catch (Exception exception) {
            throw new IllegalStateException("No se pudo guardar la imagen local", exception);
        } finally {
            sample.stop(
                Timer.builder("plura.image.store.latency")
                    .description("Image storage latency")
                    .tag("provider", "local")
                    .register(meterRegistry)
            );
        }
    }

    @Override
    public boolean deleteImage(String objectKeyOrUrl) {
        if (objectKeyOrUrl == null || objectKeyOrUrl.isBlank()) {
            return false;
        }
        try {
            String key = extractStorageKey(objectKeyOrUrl);
            if (key.isBlank() || key.equals("missing")) {
                return false;
            }
            Path targetFile = localBaseDir.resolve(key).normalize();
            if (!targetFile.startsWith(localBaseDir)) {
                LOGGER.warn("Intento de borrar ruta fuera del directorio base: {}", objectKeyOrUrl);
                return false;
            }
            boolean deleted = Files.deleteIfExists(targetFile);
            if (deleted) {
                LOGGER.info("Imagen local eliminada: {}", key);
            }
            return deleted;
        } catch (Exception exception) {
            LOGGER.warn("No se pudo eliminar imagen local: {}", objectKeyOrUrl, exception);
            return false;
        }
    }

    private String extractStorageKey(String urlOrKey) {
        String value = urlOrKey.trim();
        if (value.startsWith("r2://")) {
            String withoutScheme = value.substring("r2://".length()).replaceFirst("^/+", "");
            int slash = withoutScheme.indexOf('/');
            return slash >= 0 ? sanitizeKey(withoutScheme.substring(slash + 1)) : sanitizeKey(withoutScheme);
        }
        if (value.startsWith("r2:")) {
            return sanitizeKey(value.substring("r2:".length()).replaceFirst("^/+", ""));
        }
        if (value.startsWith(publicBaseUrl + "/")) {
            return sanitizeKey(value.substring(publicBaseUrl.length() + 1));
        }
        if (value.startsWith("/uploads/")) {
            return sanitizeKey(value.substring("/uploads/".length()));
        }
        if (value.startsWith("http://") || value.startsWith("https://")) {
            int pathStart = value.indexOf('/', value.indexOf("://") + 3);
            if (pathStart >= 0) {
                String path = value.substring(pathStart + 1);
                if (path.startsWith("uploads/")) {
                    return sanitizeKey(path.substring("uploads/".length()));
                }
            }
            return "";
        }
        return sanitizeKey(value);
    }

    private String sanitizeKey(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            return "missing";
        }
        return objectKey.trim()
            .replace("..", "")
            .replace('\\', '/')
            .replaceFirst("^/+", "");
    }

    private String extractPath(String value) {
        int schemeSeparator = value.indexOf("://");
        if (schemeSeparator < 0) {
            return value;
        }
        int pathStart = value.indexOf('/', schemeSeparator + 3);
        return pathStart >= 0 ? value.substring(pathStart) : "";
    }

    private String stripQueryAndFragment(String value) {
        String normalized = value == null ? "" : value.trim();
        int queryIndex = normalized.indexOf('?');
        if (queryIndex >= 0) {
            normalized = normalized.substring(0, queryIndex);
        }
        int fragmentIndex = normalized.indexOf('#');
        if (fragmentIndex >= 0) {
            normalized = normalized.substring(0, fragmentIndex);
        }
        return normalized;
    }

    private String normalizeBase(String baseUrl) {
        String value = baseUrl == null || baseUrl.isBlank() ? "/uploads" : baseUrl.trim();
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
