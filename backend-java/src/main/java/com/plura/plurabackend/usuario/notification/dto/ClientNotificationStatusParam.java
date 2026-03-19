package com.plura.plurabackend.usuario.notification.dto;

import com.plura.plurabackend.core.notification.query.NotificationInboxStatus;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public enum ClientNotificationStatusParam {
    ALL,
    READ,
    UNREAD;

    public static NotificationInboxStatus toInboxStatus(String rawStatus) {
        if (rawStatus == null || rawStatus.isBlank()) {
            return NotificationInboxStatus.ALL;
        }
        try {
            return NotificationInboxStatus.valueOf(rawStatus.trim().toUpperCase(java.util.Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status inválido");
        }
    }
}
