package com.plura.plurabackend.professional.paymentprovider.dto;

import java.time.LocalDateTime;

public record MercadoPagoOAuthStartResponse(
    String provider,
    String authorizationUrl,
    String state,
    LocalDateTime stateExpiresAt
) {}
