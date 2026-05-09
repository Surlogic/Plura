package com.plura.plurabackend.core.user;

/**
 * ClientNotificationRecipient es un modelo inmutable del modulo usuarios.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: notificaciones, clientes.
 */
public record ClientNotificationRecipient(
    Long userId,
    String email,
    String displayName
) {}
