package com.plura.plurabackend.core.billing.payments.provider;

import com.plura.plurabackend.core.billing.payments.model.PaymentProvider;
import java.math.BigDecimal;

public record BookingProviderCheckoutRequest(
    String transactionId,
    Long bookingId,
    Long professionalId,
    BigDecimal amount,
    String currency,
    String customerEmail,
    String customerName,
    String description,
    String splitCode,
    String webhookUrl,
    PaymentProvider provider
) {}
