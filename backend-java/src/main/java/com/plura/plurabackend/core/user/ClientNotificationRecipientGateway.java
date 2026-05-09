package com.plura.plurabackend.core.user;

import java.util.Optional;

/**
 * ClientNotificationRecipientGateway es un contrato interno del modulo usuarios.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: notificaciones, clientes.
 */
public interface ClientNotificationRecipientGateway {

    Optional<ClientNotificationRecipient> findNotificationRecipientByUserId(Long userId);
}
