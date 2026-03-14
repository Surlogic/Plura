package com.plura.plurabackend.core.auth.dto;

import lombok.Data;

@Data
public class ConfirmPhoneVerificationRequest {
    private String code;
}
