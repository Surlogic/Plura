package com.plura.plurabackend.productplan;

import java.util.EnumMap;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class ProductPlanPolicyService {

    private final Map<ProductPlanCode, ProductPlanCapabilities> capabilitiesByPlan;

    public ProductPlanPolicyService() {
        Map<ProductPlanCode, ProductPlanCapabilities> capabilities = new EnumMap<>(ProductPlanCode.class);
        ProductPlanCapabilities basic = basicCapabilities();
        ProductPlanCapabilities professional = professionalCapabilities(basic);
        ProductPlanCapabilities company = companyCapabilities(professional);

        capabilities.put(ProductPlanCode.BASIC, basic);
        capabilities.put(ProductPlanCode.PROFESSIONAL, professional);
        capabilities.put(ProductPlanCode.COMPANY, company);
        this.capabilitiesByPlan = Map.copyOf(capabilities);
    }

    public ProductPlanCapabilities capabilitiesFor(ProductPlanCode code) {
        if (code == null) {
            return capabilitiesByPlan.get(ProductPlanCode.BASIC);
        }
        return capabilitiesByPlan.getOrDefault(code, capabilitiesByPlan.get(ProductPlanCode.BASIC));
    }

    private ProductPlanCapabilities basicCapabilities() {
        return new ProductPlanCapabilities(
            1,
            5,
            1,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            true,
            true,
            true
        );
    }

    private ProductPlanCapabilities professionalCapabilities(ProductPlanCapabilities base) {
        return base
            .withMaxProfessionals(5)
            .withMaxBusinessPhotos(15)
            .withMaxServicePhotos(5)
            .withAllowClientChooseProfessional(true)
            .withAllowOnlinePayments(true)
            .withAllowAnalytics(true)
            .withAllowAdvancedClientProfile(true)
            .withAllowAutomations(true)
            .withAllowLoyalty(true)
            .withAllowLastMinute(true)
            .withAllowWhatsappAutomatic(true);
    }

    private ProductPlanCapabilities companyCapabilities(ProductPlanCapabilities base) {
        return base
            .withMaxProfessionals(25)
            .withMaxBusinessPhotos(30)
            .withMaxServicePhotos(10)
            .withAllowStore(true)
            .withAllowChat(true);
    }
}
