package com.plura.plurabackend.core.billing.payments.provider;

import java.math.BigDecimal;

public record ProviderPayoutRequest(
    String payoutRecordId,
    Long bookingId,
    Long professionalId,
    BigDecimal amount,
    String currency,
    String country,
    String beneficiaryFirstName,
    String beneficiaryLastName,
    String beneficiaryDocumentType,
    String beneficiaryDocumentNumber,
    String bankCode,
    String bankBranch,
    String bankAccountNumber,
    String bankAccountType,
    String reason,
    String webhookUrl,
    String idempotencyKey
) {}
