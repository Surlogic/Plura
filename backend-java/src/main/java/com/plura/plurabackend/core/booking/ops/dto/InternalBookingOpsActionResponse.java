package com.plura.plurabackend.core.booking.ops.dto;

public record InternalBookingOpsActionResponse(
    String action,
    String status,
    String message,
    InternalBookingOpsDetailResponse detail
) {}
