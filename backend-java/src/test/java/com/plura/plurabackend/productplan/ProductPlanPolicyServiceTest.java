package com.plura.plurabackend.productplan;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class ProductPlanPolicyServiceTest {

    private final ProductPlanPolicyService service = new ProductPlanPolicyService();

    @Test
    void professionalIncludesBasicCapabilitiesAndAddsMore() {
        ProductPlanCapabilities basic = service.capabilitiesFor(ProductPlanCode.BASIC);
        ProductPlanCapabilities professional = service.capabilitiesFor(ProductPlanCode.PROFESSIONAL);

        assertTrue(professional.maxProfessionals() > basic.maxProfessionals());
        assertTrue(professional.maxBusinessPhotos() > basic.maxBusinessPhotos());
        assertTrue(professional.maxServicePhotos() > basic.maxServicePhotos());
        assertTrue(professional.allowInAppNotifications());
        assertTrue(professional.allowNewBookingNotifications());
        assertTrue(professional.allowClientReminders());
        assertTrue(professional.allowAnalytics());
        assertFalse(basic.allowAnalytics());
    }

    @Test
    void companyIncludesProfessionalCapabilitiesAndAddsMore() {
        ProductPlanCapabilities professional = service.capabilitiesFor(ProductPlanCode.PROFESSIONAL);
        ProductPlanCapabilities company = service.capabilitiesFor(ProductPlanCode.COMPANY);

        assertTrue(company.maxProfessionals() > professional.maxProfessionals());
        assertTrue(company.maxBusinessPhotos() > professional.maxBusinessPhotos());
        assertTrue(company.maxServicePhotos() > professional.maxServicePhotos());
        assertTrue(company.allowStore());
        assertTrue(company.allowChat());
        assertTrue(company.allowAnalytics());
        assertTrue(company.allowOnlinePayments());
        assertTrue(company.allowClientChooseProfessional());
    }

    @Test
    void unknownPlanFallsBackToBasic() {
        ProductPlanCapabilities basic = service.capabilitiesFor(ProductPlanCode.BASIC);

        assertEquals(basic, service.capabilitiesFor(null));
    }
}
