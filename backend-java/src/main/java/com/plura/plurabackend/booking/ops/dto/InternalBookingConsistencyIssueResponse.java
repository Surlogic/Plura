package com.plura.plurabackend.booking.ops.dto;

public record InternalBookingConsistencyIssueResponse(
    String code,
    String detail
) {}
