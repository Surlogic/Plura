package com.plura.plurabackend.booking.ops.dto;

public record InternalBookingOpsActionResponse(
    String action,
    String status,
    String message,
    InternalBookingOpsDetailResponse detail
) {}
