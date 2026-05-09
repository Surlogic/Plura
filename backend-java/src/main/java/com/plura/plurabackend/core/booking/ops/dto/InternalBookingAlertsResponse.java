package com.plura.plurabackend.core.booking.ops.dto;

import java.util.List;

/**
 * InternalBookingAlertsResponse es un modelo inmutable del modulo reservas / operaciones internas / contratos DTO.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: paneles internos, reservas.
 */
public record InternalBookingAlertsResponse(
    List<InternalBookingIssueResponse> stalePaymentPending,
    List<InternalBookingIssueResponse> staleHeld,
    List<InternalBookingIssueResponse> staleRefundPending,
    List<InternalBookingIssueResponse> staleReleasePending,
    List<InternalBookingIssueResponse> failedRefunds,
    List<InternalBookingIssueResponse> failedPayouts,
    List<InternalBookingIssueResponse> inconsistentBookings
) {}
