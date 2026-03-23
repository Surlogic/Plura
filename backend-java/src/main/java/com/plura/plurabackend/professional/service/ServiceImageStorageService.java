package com.plura.plurabackend.professional.service;

import com.plura.plurabackend.core.storage.ImageStorageService;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ServiceImageStorageService {

    private static final long MAX_FILE_SIZE_BYTES = 1024 * 1024;
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
        "image/jpeg",
        "image/png",
        "image/webp"
    );

    private final ImageStorageService imageStorageService;

    public ServiceImageStorageService(ImageStorageService imageStorageService) {
        this.imageStorageService = imageStorageService;
    }

    public String storeServiceImage(MultipartFile file) {
        return storeProfessionalImage(file, "services", null);
    }

    public String storeProfessionalImage(MultipartFile file, String kind, String professionalId) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La imagen es obligatoria");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La imagen supera 1MB");
        }

        String contentType = file.getContentType() == null
            ? ""
            : file.getContentType().trim().toLowerCase(Locale.ROOT);
        if (!ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Formato inválido. Solo jpg, png o webp"
            );
        }

        byte[] imageBytes = readImageBytes(file);
        if (!isValidImage(imageBytes)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Archivo de imagen inválido");
        }

        String safeKind = sanitizeKind(kind);
        String safeProfessionalId = sanitizeProfessionalId(professionalId);
        String extension = resolveExtension(contentType);
        String objectKey = safeProfessionalId.isBlank()
            ? safeKind + "/" + UUID.randomUUID() + extension
            : "professionals/" + safeProfessionalId + "/" + safeKind + "/" + UUID.randomUUID() + extension;

        try {
            return imageStorageService.storeImage(imageBytes, objectKey, contentType);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No se pudo guardar la imagen");
        } catch (RuntimeException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo guardar la imagen");
        }
    }

    private byte[] readImageBytes(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No se pudo leer la imagen");
        }
    }

    private boolean isValidImage(byte[] imageBytes) {
        try (ByteArrayInputStream inputStream = new ByteArrayInputStream(imageBytes)) {
            BufferedImage image = ImageIO.read(inputStream);
            return image != null;
        } catch (IOException exception) {
            return false;
        }
    }

    private String resolveExtension(String contentType) {
        return switch (contentType) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };
    }

    private String sanitizeKind(String kind) {
        if (kind == null || kind.isBlank()) {
            return "misc";
        }
        return kind.trim().toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9/_-]", "")
            .replace("..", "")
            .replaceAll("^/+", "")
            .replaceAll("/+", "/");
    }

    private String sanitizeProfessionalId(String professionalId) {
        if (professionalId == null || professionalId.isBlank()) {
            return "";
        }
        return professionalId.trim().replaceAll("[^0-9]", "");
    }
}