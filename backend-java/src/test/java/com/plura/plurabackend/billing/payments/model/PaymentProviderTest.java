package com.plura.plurabackend.billing.payments.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.plura.plurabackend.core.billing.payments.model.PaymentProvider;
import org.junit.jupiter.api.Test;

class PaymentProviderTest {

    @Test
    void shouldAcceptMercadoPagoAsRuntimeProvider() {
        assertEquals(PaymentProvider.MERCADOPAGO, PaymentProvider.fromCode("mercadopago"));
        assertTrue(PaymentProvider.MERCADOPAGO.isRuntimeSupported());
    }

    @Test
    void shouldRejectLegacyDlocalAsRuntimeProviderInput() {
        assertTrue(PaymentProvider.DLOCAL.isLegacyReadOnly());
        assertThrows(IllegalArgumentException.class, () -> PaymentProvider.fromCode("DLOCAL"));
    }
}
