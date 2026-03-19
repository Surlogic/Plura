package com.plura.plurabackend.professional.paymentprovider.dto;

import java.time.LocalDateTime;

public record ProfessionalPaymentProviderConnectionResponse(
    String provider,
    String status,
    boolean connected,
    String providerAccountId,
    String providerUserId,
    String scope,
    LocalDateTime tokenExpiresAt,
    LocalDateTime connectedAt,
    LocalDateTime disconnectedAt,
    LocalDateTime lastSyncAt,
    String lastError
) {}
