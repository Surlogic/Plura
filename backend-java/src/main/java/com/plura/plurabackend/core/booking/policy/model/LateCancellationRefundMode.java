package com.plura.plurabackend.core.booking.policy.model;

/**
 * LateCancellationRefundMode es un enum de dominio del modulo reservas / politicas / modelo.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: la responsabilidad indicada por su paquete y nombre.
 */
public enum LateCancellationRefundMode {
    FULL,
    NONE,
    PERCENTAGE
}
