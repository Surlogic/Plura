package com.plura.plurabackend.professional.plan;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class ProfessionalPlanPolicyServiceTest {

    private final ProfessionalPlanPolicyService service = new ProfessionalPlanPolicyService();

    @Test
    void basicPlanMatchesCommercialMatrix() {
        ProfessionalPlanEntitlements basic = service.entitlementsFor(ProfessionalPlanCode.BASIC);

        assertEquals(1, basic.maxProfessionals());
        assertEquals(1, basic.maxLocations());
        assertEquals(3, basic.maxBusinessPhotos());
        assertEquals(15, basic.maxServices());
        assertEquals(PublicProfileTier.ENHANCED, basic.publicProfileTier());
        assertEquals(ScheduleTier.DAILY, basic.scheduleTier());
        assertEquals(AnalyticsTier.NONE, basic.analyticsTier());
        assertFalse(basic.allowOnlinePayments());
        assertFalse(basic.allowInternalChat());
        assertFalse(basic.allowStore());
    }

    @Test
    void profesionalPlanEnablesOperationalCapabilitiesWithoutChangingStructureLimits() {
        ProfessionalPlanEntitlements basic = service.entitlementsFor(ProfessionalPlanCode.BASIC);
        ProfessionalPlanEntitlements profesional = service.entitlementsFor(ProfessionalPlanCode.PROFESIONAL);

        assertEquals(basic.maxProfessionals(), profesional.maxProfessionals());
        assertEquals(basic.maxLocations(), profesional.maxLocations());
        assertEquals(6, profesional.maxBusinessPhotos());
        assertEquals(30, profesional.maxServices());
        assertEquals(PublicProfileTier.ENHANCED, profesional.publicProfileTier());
        assertEquals(ScheduleTier.WEEKLY, profesional.scheduleTier());
        assertEquals(AnalyticsTier.BASIC, profesional.analyticsTier());
        assertTrue(profesional.allowOnlinePayments());
        assertTrue(profesional.allowClientProfile());
        assertTrue(profesional.allowInternalClientNotes());
        assertTrue(profesional.allowVisitHistory());
        assertTrue(profesional.allowPostServiceFollowup());
        assertTrue(profesional.allowAutomations());
        assertTrue(profesional.allowInternalChat());
    }

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
