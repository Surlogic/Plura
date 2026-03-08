package com.plura.plurabackend.auth.dto;

import lombok.Data;

@Data
public class OtpChallengeSendRequest {
    private String purpose;
    private String channel;
}
