package com.plura.plurabackend.core.billing.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class BillingCheckoutRequest {

    @NotBlank
    private String planCode;

    @NotBlank
    private String provider;
}
