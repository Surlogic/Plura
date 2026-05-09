package com.plura.plurabackend.core.jobs;

import java.time.Instant;

/**
 * QueueJobMessage es un modelo inmutable del modulo jobs.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: la responsabilidad indicada por su paquete y nombre.
 */
public record QueueJobMessage(
    String jobId,
    JobType type,
    String payload,
    Instant createdAt
) {
    /**
     * Construye un mensaje con timestamp actual para trazabilidad del job.
     */
    public static QueueJobMessage now(String jobId, JobType type, String payload) {
        return new QueueJobMessage(jobId, type, payload, Instant.now());
    }
}
