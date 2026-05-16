package com.plura.plurabackend.professional.plan;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/**
 * Tests de funciones del profesional / planes y limites.
 * Cubren escenarios de profesional plan politica servicio para documentar el comportamiento esperado y evitar regresiones.
 * Mantener estos casos alineados con los contratos reales del backend cuando cambie la logica productiva.
 */
class ProfessionalPlanPolicyServiceTest {

    private final ProfessionalPlanPolicyService service = new ProfessionalPlanPolicyService();

    /**
     * Escenario: professional plan matches commercial matrix.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void corePlanMatchesMvpCommercialMatrix() {
        ProfessionalPlanEntitlements core = service.entitlementsFor(ProfessionalPlanCode.CORE);

        assertEquals(1, core.maxProfessionals());
        assertEquals(1, core.maxLocations());
        assertEquals(6, core.maxBusinessPhotos());
        assertEquals(30, core.maxServices());
        assertEquals(PublicProfileTier.ENHANCED, core.publicProfileTier());
        assertEquals(ScheduleTier.MASTER, core.scheduleTier());
        assertEquals(AnalyticsTier.NONE, core.analyticsTier());
        assertTrue(core.allowOnlinePayments());
    }

    @Test
    void nullPlanResolvesToCoreEntitlements() {
        assertEquals(service.entitlementsFor(ProfessionalPlanCode.CORE), service.entitlementsFor(null));
    }
}
