package com.plura.plurabackend.professional.worker.model;

/**
 * ProfessionalWorkerStatus es un enum de dominio del modulo profesionales / trabajadores / modelo.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: profesionales, trabajadores.
 */
public enum ProfessionalWorkerStatus {
    INVITED,
    ACTIVE,
    SUSPENDED,
    REMOVED
}
