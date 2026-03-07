package com.plura.plurabackend.billing.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class BillingCreateSubscriptionRequest {

    @NotBlank
    private String planCode;
}
