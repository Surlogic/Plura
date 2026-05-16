package com.plura.plurabackend.core.auth.dto;

import java.time.Instant;

public record RegistrationPhoneVerificationConfirmResponse(
    String verificationToken,
    Instant expiresAt
) {}
