package com.plura.plurabackend.core.jobs;

/**
 * JobType es un enum de dominio del modulo jobs.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: la responsabilidad indicada por su paquete y nombre.
 */
public enum JobType {
    THUMBNAIL,
    SCHEDULE_SUMMARY_REBUILD,
    SEARCH_INDEX_SYNC
}
