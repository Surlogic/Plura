package com.plura.plurabackend.core.booking.ops.dto;

/**
 * InternalBookingOpsActionResponse es un modelo inmutable del modulo reservas / operaciones internas / contratos DTO.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: paneles internos, reservas.
 */
public record InternalBookingOpsActionResponse(
    String action,
    String status,
    String message,
    InternalBookingOpsDetailResponse detail
) {}
