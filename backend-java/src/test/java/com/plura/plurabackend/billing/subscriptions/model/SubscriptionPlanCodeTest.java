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
    void acceptsCanonicalCodesAndLegacyAliases() {
        assertEquals(SubscriptionPlanCode.PLAN_CORE, SubscriptionPlanCode.fromCode("PLAN_CORE"));
        assertEquals(SubscriptionPlanCode.PLAN_CORE, SubscriptionPlanCode.fromCode("PLAN_LOCAL"));
        assertEquals(SubscriptionPlanCode.PLAN_CORE, SubscriptionPlanCode.fromCode("PLAN_ENTERPRISE"));
        assertEquals(SubscriptionPlanCode.PLAN_CORE, SubscriptionPlanCode.fromCode("PLAN_PROFESSIONAL"));
        assertEquals(SubscriptionPlanCode.PLAN_CORE, SubscriptionPlanCode.fromCode("PLAN_BASIC"));
        assertEquals(SubscriptionPlanCode.PLAN_CORE, SubscriptionPlanCode.fromCode("PLAN_PRO"));
        assertEquals(SubscriptionPlanCode.PLAN_CORE, SubscriptionPlanCode.fromCode("PLAN_PROFESIONAL"));
        assertEquals(SubscriptionPlanCode.PLAN_CORE, SubscriptionPlanCode.fromCode("PLAN_PREMIUM"));
        assertThrows(IllegalArgumentException.class, () -> SubscriptionPlanCode.fromCode("PLAN_INVALID"));
    }

    /**
     * Escenario: exposes canonical codes for responses.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void exposesCanonicalCodesForResponses() {
        assertEquals("PLAN_CORE", SubscriptionPlanCode.PLAN_CORE.canonicalCode());
    }
}
