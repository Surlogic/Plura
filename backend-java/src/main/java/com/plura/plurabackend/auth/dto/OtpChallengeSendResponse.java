package com.plura.plurabackend.auth.dto;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class OtpChallengeSendResponse {
    private String challengeId;
    private LocalDateTime expiresAt;
    private String maskedDestination;
}
