package com.plura.plurabackend.core.availability.model;

/**
 * AvailableSlotStatus es un enum de dominio del modulo disponibilidad / modelo.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: la responsabilidad indicada por su paquete y nombre.
 */
public enum AvailableSlotStatus {
    AVAILABLE,
    BOOKED
}
