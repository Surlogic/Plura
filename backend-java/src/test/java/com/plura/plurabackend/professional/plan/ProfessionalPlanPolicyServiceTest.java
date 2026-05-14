package com.plura.plurabackend.professional.plan;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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
    void professionalPlanMatchesCommercialMatrix() {
        ProfessionalPlanEntitlements professional = service.entitlementsFor(ProfessionalPlanCode.PROFESSIONAL);

        assertEquals(1, professional.maxProfessionals());
        assertEquals(1, professional.maxLocations());
        assertEquals(3, professional.maxBusinessPhotos());
        assertEquals(15, professional.maxServices());
        assertEquals(PublicProfileTier.ENHANCED, professional.publicProfileTier());
        assertEquals(ScheduleTier.DAILY, professional.scheduleTier());
        assertEquals(AnalyticsTier.NONE, professional.analyticsTier());
        assertFalse(professional.allowOnlinePayments());
        assertFalse(professional.allowInternalChat());
        assertFalse(professional.allowStore());
    }

    /**
     * Escenario: local plan enables operational capabilities sin changing structure limites.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void localPlanEnablesOperationalCapabilitiesWithoutChangingStructureLimits() {
        ProfessionalPlanEntitlements professional = service.entitlementsFor(ProfessionalPlanCode.PROFESSIONAL);
        ProfessionalPlanEntitlements local = service.entitlementsFor(ProfessionalPlanCode.LOCAL);

        assertEquals(professional.maxProfessionals(), local.maxProfessionals());
        assertEquals(professional.maxLocations(), local.maxLocations());
        assertEquals(6, local.maxBusinessPhotos());
        assertEquals(30, local.maxServices());
        assertEquals(PublicProfileTier.ENHANCED, local.publicProfileTier());
        assertEquals(ScheduleTier.WEEKLY, local.scheduleTier());
        assertEquals(AnalyticsTier.BASIC, local.analyticsTier());
        assertTrue(local.allowOnlinePayments());
        assertTrue(local.allowClientProfile());
        assertTrue(local.allowInternalClientNotes());
        assertTrue(local.allowVisitHistory());
        assertTrue(local.allowPostServiceFollowup());
        assertTrue(local.allowAutomations());
        assertTrue(local.allowInternalChat());
    }

    /**
     * Escenario: enterprise adds premium capabilities y practical unlimited limites.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void enterpriseAddsPremiumCapabilitiesAndPracticalUnlimitedLimits() {
        ProfessionalPlanEntitlements enterprise = service.entitlementsFor(ProfessionalPlanCode.ENTERPRISE);

        assertEquals(9999, enterprise.maxProfessionals());
        assertEquals(9999, enterprise.maxLocations());
        assertEquals(10, enterprise.maxBusinessPhotos());
        assertEquals(9999, enterprise.maxServices());
        assertEquals(ScheduleTier.MASTER, enterprise.scheduleTier());
        assertEquals(AnalyticsTier.ADVANCED, enterprise.analyticsTier());
        assertTrue(enterprise.allowLoyalty());
        assertTrue(enterprise.allowLastMinutePromotions());
        assertTrue(enterprise.allowPackages());
        assertTrue(enterprise.allowGiftCards());
        assertTrue(enterprise.allowStore());
        assertTrue(enterprise.allowShipping());
        assertTrue(enterprise.allowFeaturedReviews());
        assertTrue(enterprise.allowVerifiedBadge());
        assertTrue(enterprise.allowPortfolio());
    }
}
