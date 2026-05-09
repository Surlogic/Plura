package com.plura.plurabackend.core.billing.providerops.model;

/**
 * ProviderOperationType es un enum de dominio del modulo billing / operaciones de proveedor / modelo.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: operaciones asincronicas, proveedores externos.
 */
public enum ProviderOperationType {
    BOOKING_CHECKOUT,
    BOOKING_REFUND,
    BOOKING_PAYOUT
}
