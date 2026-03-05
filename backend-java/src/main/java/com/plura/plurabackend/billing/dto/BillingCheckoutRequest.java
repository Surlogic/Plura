package com.plura.plurabackend.billing.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class BillingCheckoutRequest {

    @NotBlank
    private String planCode;

    @NotBlank
    private String provider;
}
