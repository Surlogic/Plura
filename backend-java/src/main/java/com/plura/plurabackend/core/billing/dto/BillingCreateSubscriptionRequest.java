package com.plura.plurabackend.core.billing.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class BillingCreateSubscriptionRequest {

    @NotBlank
    private String planCode;
}
