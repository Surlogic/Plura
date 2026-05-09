package com.plura.plurabackend.core.booking.ops.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * InternalBookingIssueResponse es un modelo inmutable del modulo reservas / operaciones internas / contratos DTO.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: paneles internos, reservas.
 */
public record InternalBookingIssueResponse(
    Long bookingId,
    String operationalStatus,
    String financialStatus,
    String issueCode,
    String detail,
    LocalDateTime bookingStartDateTime,
    LocalDateTime summaryUpdatedAt,
    BigDecimal amountHeld,
    BigDecimal amountToRefund,
    BigDecimal amountToRelease,
    String lastDecisionId
) {}
