package com.plura.plurabackend.core.booking.ops.dto;

public record InternalBookingConsistencyIssueResponse(
    String code,
    String detail
) {}
