package com.plura.plurabackend.usuario.notification.dto;

import java.util.List;

/**
 * ClientNotificationTimelineResponse es un modelo inmutable del modulo cliente / notificaciones / contratos DTO.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: notificaciones, clientes.
 */
public record ClientNotificationTimelineResponse(
    Long bookingId,
    List<ClientNotificationTimelineItemResponse> items
) {}
