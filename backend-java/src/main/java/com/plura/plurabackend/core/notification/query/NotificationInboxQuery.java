package com.plura.plurabackend.core.notification.query;

import com.plura.plurabackend.core.notification.model.NotificationEventType;
import com.plura.plurabackend.core.notification.model.NotificationRecipientType;
import java.time.LocalDateTime;
import java.util.Set;

/**
 * NotificationInboxQuery es un modelo inmutable del modulo notificaciones / consultas.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: notificaciones.
 */
public record NotificationInboxQuery(
    NotificationRecipientType recipientType,
    String recipientId,
    NotificationInboxStatus status,
    Set<NotificationEventType> types,
    Long bookingId,
    LocalDateTime from,
    LocalDateTime to,
    int page,
    int size
) {}
