package com.plura.plurabackend.billing.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class BillingSubscriptionResponse {
    private String subscriptionId;
    private String planCode;
    private String status;
    private String provider;
    private BigDecimal amount;
    private String currency;
    private LocalDateTime currentPeriodStart;
    private LocalDateTime currentPeriodEnd;
    private Boolean cancelAtPeriodEnd;
    private boolean premiumEnabled;
}
