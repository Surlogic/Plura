package com.plura.plurabackend.billing.payments.provider;

import com.plura.plurabackend.billing.payments.model.PaymentProvider;

public interface PaymentProviderClient {

    PaymentProvider provider();

    ProviderCheckoutSession createCheckout(ProviderCheckoutRequest request);

    void cancelSubscription(String providerSubscriptionId, boolean immediate);

    ProviderVerificationResult verifyPayment(ProviderVerificationRequest request);
}
