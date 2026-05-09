package com.plura.plurabackend.core.auth;

/**
 * TransactionalEmailService es un contrato interno del modulo autenticacion.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: servicios, email transaccional.
 */
public interface TransactionalEmailService {

    DeliveryStatus send(TransactionalEmailMessage message);

    enum DeliveryStatus {
        SENT,
        SKIPPED_FALLBACK,
        FAILED
    }

    record TransactionalEmailMessage(
        String templateKey,
        String toAddress,
        String toName,
        String subject,
        String htmlBody,
        String textBody
    ) {}
}
