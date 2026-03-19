package com.plura.plurabackend.core.notification.dedup;

import com.plura.plurabackend.core.notification.model.NotificationEvent;
import com.plura.plurabackend.core.notification.repository.NotificationEventRepository;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class NotificationDedupeService {

    private final NotificationEventRepository notificationEventRepository;

    public NotificationDedupeService(NotificationEventRepository notificationEventRepository) {
        this.notificationEventRepository = notificationEventRepository;
    }

    public Optional<NotificationEvent> findExisting(String rawDedupeKey) {
        String normalizedDedupeKey = normalize(rawDedupeKey);
        if (normalizedDedupeKey == null) {
            return Optional.empty();
        }
        return notificationEventRepository.findByDedupeKey(normalizedDedupeKey);
    }

    public String normalize(String rawDedupeKey) {
        if (rawDedupeKey == null) {
            return null;
        }
        String normalized = rawDedupeKey.trim();
        return normalized.isBlank() ? null : normalized;
    }
}
