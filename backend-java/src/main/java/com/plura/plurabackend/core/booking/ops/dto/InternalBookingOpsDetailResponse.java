package com.plura.plurabackend.core.booking.ops.dto;

import com.plura.plurabackend.core.booking.dto.BookingActionDecisionResponse;
import com.plura.plurabackend.core.booking.dto.BookingFinancialSummaryResponse;
import com.plura.plurabackend.core.booking.dto.BookingPayoutRecordResponse;
import com.plura.plurabackend.core.booking.dto.BookingRefundRecordResponse;
import com.plura.plurabackend.core.booking.dto.ProfessionalBookingResponse;
import java.util.List;

/**
 * InternalBookingOpsDetailResponse es un modelo inmutable del modulo reservas / operaciones internas / contratos DTO.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: paneles internos, reservas.
 */
public record InternalBookingOpsDetailResponse(
    ProfessionalBookingResponse booking,
    List<BookingActionDecisionResponse> actionDecisions,
    BookingFinancialSummaryResponse financialSummary,
    List<BookingRefundRecordResponse> refundRecords,
    List<BookingPayoutRecordResponse> payoutRecords,
    List<InternalPaymentTransactionResponse> paymentTransactions,
    List<InternalPaymentEventResponse> paymentEvents,
    List<InternalBookingEventResponse> bookingEvents,
    List<InternalBookingConsistencyIssueResponse> consistencyIssues
) {}
