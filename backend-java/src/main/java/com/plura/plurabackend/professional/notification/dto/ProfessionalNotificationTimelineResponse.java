package com.plura.plurabackend.professional.notification.dto;

import java.util.List;

/**
 * ProfessionalNotificationTimelineResponse es un modelo inmutable del modulo profesionales / notificaciones / contratos DTO.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: profesionales, notificaciones.
 */
public record ProfessionalNotificationTimelineResponse(
    Long bookingId,
    List<ProfessionalNotificationTimelineItemResponse> items
) {}
