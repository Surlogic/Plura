package com.plura.plurabackend.usuario.notification.dto;

/**
 * ClientPushTokenUpsertRequest es un modelo inmutable del modulo cliente / notificaciones / contratos DTO.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Validacion: sus anotaciones Bean Validation son parte del contrato publico del endpoint que lo recibe.
 * Foco funcional: clientes.
 */
public record ClientPushTokenUpsertRequest(
    String pushToken,
    String platform,
    Boolean enabled
) {}
