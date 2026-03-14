package com.plura.plurabackend.core.booking.ops.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

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
