package com.plura.plurabackend.core.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class EmailVerificationSendResponse {

    private String message;
    private Long cooldownSeconds;
}
