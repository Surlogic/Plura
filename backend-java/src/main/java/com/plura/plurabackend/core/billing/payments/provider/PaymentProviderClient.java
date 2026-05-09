package com.plura.plurabackend.core.billing.payments.provider;

import com.plura.plurabackend.core.billing.payments.model.PaymentProvider;

/**
 * PaymentProviderClient es un contrato interno del modulo billing / pagos.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: proveedores externos, pagos, clientes.
 */
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
