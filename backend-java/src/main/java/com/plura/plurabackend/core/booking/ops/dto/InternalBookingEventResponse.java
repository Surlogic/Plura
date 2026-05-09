package com.plura.plurabackend.core.booking.ops.dto;

import java.time.LocalDateTime;

/**
 * InternalBookingEventResponse es un modelo inmutable del modulo reservas / operaciones internas / contratos DTO.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: paneles internos, reservas.
 */
public record InternalBookingEventResponse(
    String id,
    String eventType,
    String actorType,
    Long actorUserId,
    String payloadJson,
    LocalDateTime createdAt
) {}
