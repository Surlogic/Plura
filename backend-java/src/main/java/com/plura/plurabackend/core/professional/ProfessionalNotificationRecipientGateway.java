package com.plura.plurabackend.core.professional;

import java.util.Optional;

/**
 * ProfessionalNotificationRecipientGateway es un contrato interno del modulo profesionales.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: profesionales, notificaciones.
 */
public interface ProfessionalNotificationRecipientGateway {

    Optional<ProfessionalNotificationRecipient> findNotificationRecipientByProfessionalId(Long professionalId);
}
