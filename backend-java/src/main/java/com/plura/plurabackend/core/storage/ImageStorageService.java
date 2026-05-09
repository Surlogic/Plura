package com.plura.plurabackend.core.storage;

/**
 * ImageStorageService es un contrato interno del modulo storage.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: storage de archivos, servicios, imagenes.
 */
public interface ImageStorageService {
    String generateUploadUrl(String objectKey);

    String generatePublicUrl(String objectKey);

    String storeImage(byte[] bytes, String objectKey, String contentType);

    default String normalizeStoredReference(String urlOrStorageKey) {
        if (urlOrStorageKey == null) {
            return null;
        }
        String trimmed = urlOrStorageKey.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    default String generateUploadUrl(String objectKey, String contentType, long contentLength) {
        return generateUploadUrl(objectKey);
    }

    default boolean deleteImage(String objectKeyOrUrl) {
        return false;
    }

    default String resolvePublicUrl(String urlOrStorageKey) {
        if (urlOrStorageKey == null || urlOrStorageKey.isBlank()) {
            return urlOrStorageKey;
        }
        String trimmed = urlOrStorageKey.trim();
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            return trimmed;
        }
        if (trimmed.startsWith("/")) {
            // Evita protocol-relative URLs del tipo //attacker.example.
            if (trimmed.startsWith("//")) {
                return "/" + trimmed.replaceFirst("^/+", "");
            }
            return trimmed;
        }
        return generatePublicUrl(trimmed);
    }
}
