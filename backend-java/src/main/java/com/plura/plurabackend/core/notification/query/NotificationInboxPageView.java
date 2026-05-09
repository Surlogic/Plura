package com.plura.plurabackend.core.notification.query;

import java.util.List;

/**
 * NotificationInboxPageView es un modelo inmutable del modulo notificaciones / consultas.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: notificaciones.
 */
public record NotificationInboxPageView(
    int page,
    int size,
    long total,
    List<NotificationInboxItemView> items
) {}
