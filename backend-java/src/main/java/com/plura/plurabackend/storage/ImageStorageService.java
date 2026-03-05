package com.plura.plurabackend.storage;

public interface ImageStorageService {
    String generateUploadUrl(String objectKey);

    String generatePublicUrl(String objectKey);

    default String generateUploadUrl(String objectKey, String contentType, long contentLength) {
        return generateUploadUrl(objectKey);
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
