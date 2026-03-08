package com.plura.plurabackend.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PhoneVerificationSendResponse {
    private String message;
    private Long cooldownSeconds;
}
