package com.plura.plurabackend.billing.payments.provider;

import com.plura.plurabackend.billing.payments.model.PaymentProvider;

public interface PaymentProviderClient {

    PaymentProvider provider();

    ProviderCheckoutSession createCheckout(ProviderCheckoutRequest request);

    void cancelSubscription(String providerSubscriptionId, boolean immediate);

    ProviderVerificationResult verifyPayment(ProviderVerificationRequest request);

    default ProviderCheckoutSession createBookingCheckout(BookingProviderCheckoutRequest request) {
        throw new UnsupportedOperationException("Booking checkout no soportado para " + provider().name());
    }

    default ProviderRefundResult createRefund(ProviderRefundRequest request) {
        throw new UnsupportedOperationException("Refund no soportado para " + provider().name());
    }

    default ProviderPayoutResult createPayout(ProviderPayoutRequest request) {
        throw new UnsupportedOperationException("Payout no soportado para " + provider().name());
    }
}
