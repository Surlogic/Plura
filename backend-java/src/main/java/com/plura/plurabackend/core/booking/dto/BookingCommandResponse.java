package com.plura.plurabackend.core.booking.dto;

import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BookingCommandResponse {
    private ProfessionalBookingResponse booking;
    private BookingActionDecisionResponse decision;
    private String operationalStatus;
    private BookingFinancialSummaryResponse financialSummary;
    private BookingRefundRecordResponse refundRecord;
    private BookingPayoutRecordResponse payoutRecord;
    private String messageCode;
    private Map<String, String> messageParams;
    private String plainTextFallback;
}
