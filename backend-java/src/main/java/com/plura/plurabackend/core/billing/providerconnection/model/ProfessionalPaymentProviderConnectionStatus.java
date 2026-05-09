package com.plura.plurabackend.core.billing.providerconnection.model;

/**
 * ProfessionalPaymentProviderConnectionStatus es un enum de dominio del modulo billing / conexion de proveedor / modelo.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: profesionales, proveedores externos, pagos.
 */
public enum ProfessionalPaymentProviderConnectionStatus {
    PENDING_AUTHORIZATION,
    CONNECTED,
    ERROR,
    DISCONNECTED
}
