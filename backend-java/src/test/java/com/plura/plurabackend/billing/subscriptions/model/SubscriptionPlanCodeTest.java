package com.plura.plurabackend.core.billing.subscriptions.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

/**
 * Tests de billing, pagos, webhooks y proveedores / suscripciones.
 * Cubren escenarios de suscripcion plan code para documentar el comportamiento esperado y evitar regresiones.
 * Mantener estos casos alineados con los contratos reales del backend cuando cambie la logica productiva.
 */
class SubscriptionPlanCodeTest {

    /**
     * Escenario: accepts only canonical codes.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void acceptsOnlyCanonicalCodes() {
        assertEquals(SubscriptionPlanCode.PLAN_BASIC, SubscriptionPlanCode.fromCode("PLAN_BASIC"));
        assertEquals(SubscriptionPlanCode.PLAN_PROFESIONAL, SubscriptionPlanCode.fromCode("PLAN_PROFESIONAL"));
        assertEquals(SubscriptionPlanCode.PLAN_ENTERPRISE, SubscriptionPlanCode.fromCode("PLAN_ENTERPRISE"));
        assertThrows(IllegalArgumentException.class, () -> SubscriptionPlanCode.fromCode("PLAN_PRO"));
        assertThrows(IllegalArgumentException.class, () -> SubscriptionPlanCode.fromCode("PLAN_PREMIUM"));
    }

    /**
     * Escenario: exposes canonical codes for responses.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void exposesCanonicalCodesForResponses() {
        assertEquals("PLAN_BASIC", SubscriptionPlanCode.PLAN_BASIC.canonicalCode());
        assertEquals("PLAN_PROFESIONAL", SubscriptionPlanCode.PLAN_PROFESIONAL.canonicalCode());
        assertEquals("PLAN_ENTERPRISE", SubscriptionPlanCode.PLAN_ENTERPRISE.canonicalCode());
    }
}
