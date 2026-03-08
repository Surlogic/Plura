package com.plura.plurabackend.auth.dto;

import lombok.Data;

@Data
public class ConfirmPhoneVerificationRequest {
    private String code;
}
