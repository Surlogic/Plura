package com.plura.plurabackend.billing.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class BillingCheckoutResponse {
    private String subscriptionId;
    private String checkoutUrl;
    private String provider;
    private String planCode;
}
