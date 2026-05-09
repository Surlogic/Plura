package com.plura.plurabackend.core.booking.ops.dto;

import java.time.LocalDateTime;

/**
 * InternalPaymentEventResponse es un modelo inmutable del modulo reservas / operaciones internas / contratos DTO.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: paneles internos, pagos.
 */
public record InternalPaymentEventResponse(
    String id,
    String provider,
    String eventType,
    String providerEventId,
    String providerObjectId,
    Boolean processed,
    LocalDateTime processedAt,
    String processingError,
    LocalDateTime createdAt
) {}
