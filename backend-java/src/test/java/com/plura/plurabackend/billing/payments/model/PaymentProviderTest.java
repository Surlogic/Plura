package com.plura.plurabackend.billing.payments.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.plura.plurabackend.core.billing.payments.model.PaymentProvider;
import org.junit.jupiter.api.Test;

/**
 * Tests de billing, pagos, webhooks y proveedores / pagos.
 * Cubren escenarios de pago proveedor para documentar el comportamiento esperado y evitar regresiones.
 * Mantener estos casos alineados con los contratos reales del backend cuando cambie la logica productiva.
 */
class PaymentProviderTest {

    /**
     * Escenario: debe accept Mercado Pago como runtime proveedor.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void shouldAcceptMercadoPagoAsRuntimeProvider() {
        assertEquals(PaymentProvider.MERCADOPAGO, PaymentProvider.fromCode("mercadopago"));
        assertTrue(PaymentProvider.MERCADOPAGO.isRuntimeSupported());
    }

    /**
     * Escenario: debe rechazar legacy dlocal como runtime proveedor input.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void shouldRejectLegacyDlocalAsRuntimeProviderInput() {
        assertTrue(PaymentProvider.DLOCAL.isLegacyReadOnly());
        assertThrows(IllegalArgumentException.class, () -> PaymentProvider.fromCode("DLOCAL"));
    }
}
