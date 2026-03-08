package com.plura.plurabackend.booking.ops.dto;

import com.plura.plurabackend.booking.dto.BookingActionDecisionResponse;
import com.plura.plurabackend.booking.dto.BookingFinancialSummaryResponse;
import com.plura.plurabackend.booking.dto.BookingPayoutRecordResponse;
import com.plura.plurabackend.booking.dto.BookingRefundRecordResponse;
import com.plura.plurabackend.booking.dto.ProfessionalBookingResponse;
import java.util.List;

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
