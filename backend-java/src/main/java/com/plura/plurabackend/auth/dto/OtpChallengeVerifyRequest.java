package com.plura.plurabackend.auth.dto;

import lombok.Data;

@Data
public class OtpChallengeVerifyRequest {
    private String challengeId;
    private String code;
}
