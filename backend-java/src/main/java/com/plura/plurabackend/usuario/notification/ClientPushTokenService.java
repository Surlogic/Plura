package com.plura.plurabackend.usuario.notification;

import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.repository.UserRepository;
import com.plura.plurabackend.usuario.notification.dto.ClientPushTokenUpsertRequest;
import com.plura.plurabackend.usuario.notification.model.ClientPushDevice;
import com.plura.plurabackend.usuario.notification.repository.ClientPushDeviceRepository;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ClientPushTokenService {

    private final ClientPushDeviceRepository clientPushDeviceRepository;
    private final UserRepository userRepository;

    public ClientPushTokenService(
        ClientPushDeviceRepository clientPushDeviceRepository,
        UserRepository userRepository
    ) {
        this.clientPushDeviceRepository = clientPushDeviceRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void sync(Long userId, ClientPushTokenUpsertRequest request) {
        String normalizedToken = normalizePushToken(request.pushToken());
        String normalizedPlatform = normalizePlatform(request.platform());
        boolean enabled = request.enabled() == null || Boolean.TRUE.equals(request.enabled());
        Optional<ClientPushDevice> existingDevice = clientPushDeviceRepository.findByPushToken(normalizedToken);

        if (!enabled && existingDevice.isEmpty()) {
            return;
        }

        User user = userRepository
            .findByIdAndDeletedAtIsNull(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));

        ClientPushDevice device = existingDevice.orElseGet(ClientPushDevice::new);

        device.setUser(user);
        device.setPushToken(normalizedToken);
        device.setPlatform(normalizedPlatform);
        device.setEnabled(enabled);
        device.setLastSeenAt(LocalDateTime.now());
        clientPushDeviceRepository.save(device);
    }

    private String normalizePushToken(String rawPushToken) {
        if (rawPushToken == null || rawPushToken.trim().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "pushToken es obligatorio");
        }
        String normalized = rawPushToken.trim();
        if (normalized.length() > 255) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "pushToken excede el largo maximo");
        }
        return normalized;
    }

    private String normalizePlatform(String rawPlatform) {
        if (rawPlatform == null || rawPlatform.trim().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "platform es obligatorio");
        }

        String normalized = rawPlatform.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "ANDROID", "IOS", "WEB" -> normalized;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "platform invalido");
        };
    }
}
