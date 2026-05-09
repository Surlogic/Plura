package com.plura.plurabackend.core.notification.dedup;

import com.plura.plurabackend.core.notification.model.NotificationEvent;
import com.plura.plurabackend.core.notification.repository.NotificationEventRepository;
import java.util.Optional;
import org.springframework.stereotype.Service;

/**
 * NotificationDedupeService es un servicio de negocio del modulo notificaciones / deduplicacion.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: notificationEventRepository.
 * Foco funcional: notificaciones, servicios.
 */
@Service
public class NotificationDedupeService {

    private final NotificationEventRepository notificationEventRepository;

    public NotificationDedupeService(NotificationEventRepository notificationEventRepository) {
        this.notificationEventRepository = notificationEventRepository;
    }

    /**
     * Busca existing aplicando filtros, joins o criterios del caso de uso.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
    public Optional<NotificationEvent> findExisting(String rawDedupeKey) {
        String normalizedDedupeKey = normalize(rawDedupeKey);
        if (normalizedDedupeKey == null) {
            return Optional.empty();
        }
        return notificationEventRepository.findByDedupeKey(normalizedDedupeKey);
    }

    /**
     * Normaliza normalizar para evitar variantes vacias, invalidas o inconsistentes.
     */
    public String normalize(String rawDedupeKey) {
        if (rawDedupeKey == null) {
            return null;
        }
        String normalized = rawDedupeKey.trim();
        return normalized.isBlank() ? null : normalized;
    }
}
