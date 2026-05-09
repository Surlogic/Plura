package com.plura.plurabackend.core.notification.email;

/**
 * NotificationEmailSender es un contrato interno del modulo notificaciones / email.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: notificaciones, email transaccional.
 */
public interface NotificationEmailSender {

    NotificationEmailSendResult send(NotificationEmailMessage message);
}
