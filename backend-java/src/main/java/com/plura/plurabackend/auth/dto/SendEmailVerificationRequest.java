package com.plura.plurabackend.auth.dto;

import lombok.Data;

@Data
public class SendEmailVerificationRequest {

    private String email;
}
