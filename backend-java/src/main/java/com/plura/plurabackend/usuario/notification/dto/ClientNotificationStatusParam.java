package com.plura.plurabackend.usuario.notification.dto;

import com.plura.plurabackend.core.notification.query.NotificationInboxStatus;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * ClientNotificationStatusParam es un enum de dominio del modulo cliente / notificaciones / contratos DTO.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: notificaciones, clientes.
 */
public enum ClientNotificationStatusParam {
    ALL,
    READ,
    UNREAD;

    /**
     * Convierte datos internos al formato inbox estado esperado por el consumidor.
     */
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
