package com.plura.plurabackend.billing.payments.provider;

public record ProviderCheckoutSession(
    String checkoutUrl,
    String providerSubscriptionId,
    String providerCustomerId
) {}
