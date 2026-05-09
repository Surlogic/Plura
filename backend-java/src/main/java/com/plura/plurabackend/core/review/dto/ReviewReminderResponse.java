package com.plura.plurabackend.core.review.dto;

import java.time.LocalDateTime;

/**
 * ReviewReminderResponse es un modelo inmutable del modulo resenas / contratos DTO.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: resenas.
 */
public record ReviewReminderResponse(
    Long bookingId,
    String professionalName,
    String serviceName,
    LocalDateTime completedAt,
    LocalDateTime reviewWindowEndsAt,
    int reminderCount
) {}
