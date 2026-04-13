package com.plura.plurabackend.core.booking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ClientNextBookingResponse {
    private Long id;
    private String status;
    private String startDateTime;
    private String startDateTimeUtc;
    private String timezone;
    private String serviceId;
    private String serviceName;
    private String paymentType;
    private String paymentStatus;
    private String refundStatus;
    private String payoutStatus;
    private BookingPaymentBreakdownResponse paymentBreakdown;
    private BookingFinancialSummaryResponse financialSummary;
    private BookingRefundRecordResponse latestRefund;
    private BookingPayoutRecordResponse latestPayout;
    private BookingPolicySnapshotResponse policySnapshot;
    private String professionalName;
    private String professionalSlug;
    private String professionalLocation;
}
