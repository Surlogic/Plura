package com.plura.plurabackend.core.billing.payments.provider;

public record ProviderCheckoutSession(
    String checkoutUrl,
    String providerSubscriptionId,
    String providerCustomerId
) {}
