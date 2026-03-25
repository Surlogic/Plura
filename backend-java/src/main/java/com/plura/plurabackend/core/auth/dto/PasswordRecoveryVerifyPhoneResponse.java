package com.plura.plurabackend.core.auth.dto;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PasswordRecoveryVerifyPhoneResponse {
    private String challengeId;
    private LocalDateTime expiresAt;
    private String maskedDestination;
}
