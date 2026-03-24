package com.plura.plurabackend.core.storage;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class ImageCleanupService {

    private static final Logger LOGGER = LoggerFactory.getLogger(ImageCleanupService.class);
    private static final int[] THUMBNAIL_SIZES = {200, 400, 800};

    private final ImageStorageService imageStorageService;

    public ImageCleanupService(ImageStorageService imageStorageService) {
        this.imageStorageService = imageStorageService;
    }

    public void deleteIfChanged(String oldUrl, String newUrl) {
        if (!isManagedImage(oldUrl)) {
            return;
        }
        String normalizedOld = oldUrl.trim();
        String normalizedNew = newUrl == null ? "" : newUrl.trim();
        if (normalizedOld.equals(normalizedNew)) {
            return;
        }
        safeDelete(normalizedOld);
    }

    public void deleteIfRemoved(String oldUrl) {
        if (!isManagedImage(oldUrl)) {
            return;
        }
        safeDelete(oldUrl.trim());
    }

    public void deleteRemovedFromList(List<String> oldUrls, List<String> newUrls) {
        if (oldUrls == null || oldUrls.isEmpty()) {
            return;
        }
        Set<String> kept = new HashSet<>();
        if (newUrls != null) {
            for (String url : newUrls) {
                if (url != null && !url.isBlank()) {
                    kept.add(url.trim());
                }
            }
        }
        for (String oldUrl : oldUrls) {
            if (oldUrl != null && !oldUrl.isBlank() && !kept.contains(oldUrl.trim())) {
                if (isManagedImage(oldUrl)) {
                    safeDelete(oldUrl.trim());
                }
            }
        }
    }

    private boolean isManagedImage(String url) {
        if (url == null || url.isBlank()) {
            return false;
        }
        String trimmed = url.trim();
        return trimmed.startsWith("r2://")
            || trimmed.startsWith("r2:")
            || trimmed.startsWith("/uploads/")
            || (trimmed.startsWith("professionals/") || trimmed.startsWith("services/"));
    }

    private void safeDelete(String url) {
        try {
            boolean deleted = imageStorageService.deleteImage(url);
            if (deleted) {
                LOGGER.info("Imagen eliminada del storage: {}", url);
            } else {
                LOGGER.debug("No se eliminó imagen (no encontrada o no soportada): {}", url);
            }
        } catch (Exception exception) {
            LOGGER.warn("Error al eliminar imagen del storage: {}", url, exception);
        }
        deleteThumbnails(url);
    }

    private void deleteThumbnails(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return;
        }
        String trimmed = imageUrl.trim();
        int lastSlash = trimmed.lastIndexOf('/');
        int lastDot = trimmed.lastIndexOf('.');
        if (lastDot <= lastSlash) {
            return;
        }
        String basePath = lastSlash >= 0 ? trimmed.substring(0, lastSlash) : "";
        String extension = trimmed.substring(lastDot);
        for (int size : THUMBNAIL_SIZES) {
            String thumbKey = basePath.isBlank()
                ? "thumb_" + size + extension
                : basePath + "/thumb_" + size + extension;
            try {
                imageStorageService.deleteImage(thumbKey);
            } catch (Exception exception) {
                LOGGER.debug("No se pudo eliminar thumbnail {}: {}", thumbKey, exception.getMessage());
            }
        }
    }
}
