package com.plura.plurabackend.core.booking.bridge;

/**
 * BookingProfessionalPlanGateway es un contrato interno del modulo reservas / adaptadores.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: profesionales, reservas, planes.
 */
public interface BookingProfessionalPlanGateway {

    boolean allowsOnlinePayments(Long professionalId);
}
