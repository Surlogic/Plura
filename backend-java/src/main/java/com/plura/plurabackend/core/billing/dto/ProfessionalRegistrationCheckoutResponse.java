package com.plura.plurabackend.core.billing.dto;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ProfessionalRegistrationCheckoutResponse {
    private String checkoutUrl;
    private String checkoutToken;
    private String checkoutRef;
    private String provider;
    private String planCode;
    private String status;
    private LocalDateTime trialStartAt;
    private LocalDateTime trialEndAt;
    private Boolean requiresCheckout;
    private Boolean confirmed;
}
