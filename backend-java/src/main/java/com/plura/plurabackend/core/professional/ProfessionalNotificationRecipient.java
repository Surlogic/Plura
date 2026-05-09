package com.plura.plurabackend.core.professional;

/**
 * ProfessionalNotificationRecipient es un modelo inmutable del modulo profesionales.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: profesionales, notificaciones.
 */
public record ProfessionalNotificationRecipient(
    Long professionalId,
    String email,
    String displayName
) {}
