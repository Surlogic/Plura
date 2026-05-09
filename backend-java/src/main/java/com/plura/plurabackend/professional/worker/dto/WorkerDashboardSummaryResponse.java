package com.plura.plurabackend.professional.worker.dto;

/**
 * WorkerDashboardSummaryResponse es un modelo inmutable del modulo profesionales / trabajadores / contratos DTO.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: trabajadores.
 */
public record WorkerDashboardSummaryResponse(
    String workerId,
    String displayName,
    String email,
    String status,
    String professionalId,
    String professionalName,
    String professionalSlug
) {}
