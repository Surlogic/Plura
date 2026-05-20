package com.plura.plurabackend.core.billing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ProfessionalRegistrationCheckoutVerifyRequest {

    @NotBlank
    private String checkoutToken;

    @Size(max = 128)
    private String providerSubscriptionId;
}
