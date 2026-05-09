package com.plura.plurabackend.core.review.dto;

/**
 * ReviewReminderShownResponse es un modelo inmutable del modulo resenas / contratos DTO.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: resenas.
 */
public record ReviewReminderShownResponse(
    boolean recorded,
    int reminderCount,
    String reason
) {}
