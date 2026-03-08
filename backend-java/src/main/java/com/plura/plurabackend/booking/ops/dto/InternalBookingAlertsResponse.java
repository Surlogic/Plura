package com.plura.plurabackend.booking.ops.dto;

import java.util.List;

public record InternalBookingAlertsResponse(
    List<InternalBookingIssueResponse> stalePaymentPending,
    List<InternalBookingIssueResponse> staleHeld,
    List<InternalBookingIssueResponse> staleRefundPending,
    List<InternalBookingIssueResponse> staleReleasePending,
    List<InternalBookingIssueResponse> failedRefunds,
    List<InternalBookingIssueResponse> failedPayouts,
    List<InternalBookingIssueResponse> inconsistentBookings
) {}
