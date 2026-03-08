package com.plura.plurabackend.auth.dto;

import lombok.Data;

@Data
public class ConfirmEmailVerificationRequest {

    private String code;
}
