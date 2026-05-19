package com.plura.plurabackend.core.billing.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ProfessionalRegistrationCheckoutVerifyRequest {

    @NotBlank
    private String checkoutToken;
}
