package com.plura.plurabackend.booking.ops.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record InternalPaymentTransactionResponse(
    String id,
    String transactionType,
    String status,
    String provider,
    String providerPaymentId,
    String externalReference,
    BigDecimal amount,
    String currency,
    String providerStatus,
    LocalDateTime createdAt,
    LocalDateTime approvedAt,
    LocalDateTime failedAt
) {}
