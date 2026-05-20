package com.plura.plurabackend.core.billing.dto;

import lombok.Data;

@Data
public class ProfessionalRegistrationCheckoutVerifyRequest {
    private String checkoutToken;
    private String checkoutRef;
}
