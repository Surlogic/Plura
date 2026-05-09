package com.plura.plurabackend.professional.notification.dto;

/**
 * ProfessionalNotificationUnreadCountResponse es un modelo inmutable del modulo profesionales / notificaciones / contratos DTO.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: profesionales, notificaciones.
 */
public record ProfessionalNotificationUnreadCountResponse(long count) {}
