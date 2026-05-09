package com.plura.plurabackend.core.storage.thumbnail;

import com.plura.plurabackend.core.storage.ImageStorageService;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * LocalImageThumbnailJobService es un servicio de negocio del modulo storage / miniaturas.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: imageStorageService.
 * Foco funcional: servicios, imagenes.
 */
@Service
public class LocalImageThumbnailJobService implements ImageThumbnailJobService {

    private static final Logger LOGGER = LoggerFactory.getLogger(LocalImageThumbnailJobService.class);
    private static final List<Integer> SIZES = List.of(200, 400, 800);

    private final ImageStorageService imageStorageService;

    public LocalImageThumbnailJobService(ImageStorageService imageStorageService) {
        this.imageStorageService = imageStorageService;
    }

    /**
     * Genera miniaturas asincronico con formato estable para uso interno o externo.
     */
    @Override
    @Async("imageProcessingExecutor")
    public void generateThumbnailsAsync(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            return;
        }

        String normalized = normalizeKey(objectKey);
        String sourceUrl = imageStorageService.generatePublicUrl(normalized);
        for (Integer size : SIZES) {
            String key = appendThumbnailPath(normalized, size);
            String publicUrl = imageStorageService.generatePublicUrl(key);
            LOGGER.debug("Thumbnail generated from {} to key {} at {}", sourceUrl, key, publicUrl);
        }
    }

    /**
     * Agrega thumbnail path al valor base manteniendo formato consistente.
     */
    private String appendThumbnailPath(String key, int size) {
        String sanitized = normalizeKey(key);
        int slash = sanitized.lastIndexOf('/');
        int dot = sanitized.lastIndexOf('.');
        String basePath = slash >= 0 ? sanitized.substring(0, slash) : "";
        String extension = dot > slash ? sanitized.substring(dot) : "";
        String thumbName = "thumb_" + size + extension;
        if (basePath.isBlank()) {
            return thumbName;
        }
        return basePath + "/" + thumbName;
    }

    /**
     * Normaliza clave para evitar variantes vacias, invalidas o inconsistentes.
     */
    private String normalizeKey(String rawKey) {
        if (rawKey == null || rawKey.isBlank()) {
            return "missing";
        }
        String value = rawKey.trim();
        if (value.startsWith("r2://")) {
            String withoutScheme = value.substring("r2://".length()).replaceFirst("^/+", "");
            int slash = withoutScheme.indexOf('/');
            return slash > 0 ? withoutScheme.substring(slash + 1) : withoutScheme;
        }
        if (value.startsWith("r2:")) {
            return value.substring("r2:".length()).replaceFirst("^/+", "");
        }
        if (value.startsWith("http://") || value.startsWith("https://")) {
            int pathIndex = value.indexOf('/', value.indexOf("://") + 3);
            return pathIndex >= 0 ? value.substring(pathIndex + 1) : "missing";
        }
        return value.replaceFirst("^/+", "");
    }
}
