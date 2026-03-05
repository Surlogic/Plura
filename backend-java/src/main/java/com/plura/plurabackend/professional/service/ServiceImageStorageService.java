package com.plura.plurabackend.professional.service;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.springframework.beans.factory.annotation.Value;
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

    private final Path uploadRootPath;

    public ServiceImageStorageService(@Value("${app.storage.upload-dir:uploads}") String uploadDir) {
        this.uploadRootPath = Path.of(uploadDir).toAbsolutePath().normalize();
    }

    public String storeServiceImage(MultipartFile file) {
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

        String extension = resolveExtension(contentType);
        String fileName = "service-" + UUID.randomUUID() + extension;
        Path targetDirectory = uploadRootPath.resolve("services").normalize();
        Path targetFile = targetDirectory.resolve(fileName).normalize();
        if (!targetFile.startsWith(targetDirectory)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ruta de archivo inválida");
        }

        try {
            Files.createDirectories(targetDirectory);
            Files.write(
                targetFile,
                imageBytes,
                StandardOpenOption.CREATE,
                StandardOpenOption.TRUNCATE_EXISTING,
                StandardOpenOption.WRITE
            );
        } catch (IOException exception) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "No se pudo guardar la imagen"
            );
        }

        return "/uploads/services/" + fileName;
    }

    private String resolveExtension(String contentType) {
        return switch (contentType) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Formato inválido");
        };
    }

    private byte[] readImageBytes(MultipartFile file) {
        try {
            byte[] bytes = file.getBytes();
            if (bytes.length == 0 || bytes.length > MAX_FILE_SIZE_BYTES) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La imagen supera 1MB");
            }
            return bytes;
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Archivo de imagen inválido");
        }
    }

    private boolean isValidImage(byte[] imageBytes) {
        try {
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(imageBytes));
            if (image == null) {
                return false;
            }
            int width = image.getWidth();
            int height = image.getHeight();
            return width > 0 && height > 0 && width <= 8000 && height <= 8000;
        } catch (IOException exception) {
            return false;
        }
    }
}
