package com.plura.plurabackend.productplan;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.billing.payments.model.PaymentProvider;
import com.plura.plurabackend.billing.subscriptions.model.Subscription;
import com.plura.plurabackend.billing.subscriptions.model.SubscriptionPlan;
import com.plura.plurabackend.billing.subscriptions.model.SubscriptionStatus;
import com.plura.plurabackend.billing.subscriptions.repository.SubscriptionRepository;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class EffectiveProductPlanServiceTest {

    private final SubscriptionRepository subscriptionRepository = mock(SubscriptionRepository.class);
    private final ProductPlanPolicyService policyService = new ProductPlanPolicyService();
    private final EffectiveProductPlanService service = new EffectiveProductPlanService(
        subscriptionRepository,
        policyService
    );

    @Test
    void resolvesBasicWhenProfessionalHasNoSubscription() {
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(10L);
        when(subscriptionRepository.findByProfessional_Id(10L)).thenReturn(Optional.empty());

        EffectiveProductPlan effectivePlan = service.resolveForProfessional(profile);

        assertEquals(ProductPlanCode.BASIC, effectivePlan.code());
    }

    @Test
    void resolvesProfessionalWhenActivePlanProExists() {
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(20L);
        when(subscriptionRepository.findByProfessional_Id(20L)).thenReturn(Optional.of(activeSubscription(SubscriptionPlan.PLAN_PRO)));

        EffectiveProductPlan effectivePlan = service.resolveForProfessional(profile);

        assertEquals(ProductPlanCode.PROFESSIONAL, effectivePlan.code());
        assertTrue(effectivePlan.capabilities().allowAnalytics());
    }

    @Test
    void resolvesCompanyWhenActivePremiumExists() {
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(30L);
        when(subscriptionRepository.findByProfessional_Id(30L)).thenReturn(Optional.of(activeSubscription(SubscriptionPlan.PLAN_PREMIUM)));

        EffectiveProductPlan effectivePlan = service.resolveForProfessional(profile);

        assertEquals(ProductPlanCode.COMPANY, effectivePlan.code());
        assertTrue(effectivePlan.capabilities().allowStore());
        assertTrue(effectivePlan.capabilities().allowChat());
    }

    @Test
    void fallsBackToBasicWhenSubscriptionIsInactive() {
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(40L);
        Subscription subscription = activeSubscription(SubscriptionPlan.PLAN_PREMIUM);
        subscription.setStatus(SubscriptionStatus.CANCELLED);
        when(subscriptionRepository.findByProfessional_Id(40L)).thenReturn(Optional.of(subscription));

        EffectiveProductPlan effectivePlan = service.resolveForProfessional(profile);

        assertEquals(ProductPlanCode.BASIC, effectivePlan.code());
    }

    private Subscription activeSubscription(SubscriptionPlan plan) {
        Subscription subscription = new Subscription();
        subscription.setPlan(plan);
        subscription.setStatus(SubscriptionStatus.ACTIVE);
        subscription.setProvider(PaymentProvider.MERCADOPAGO);
        subscription.setPlanAmount(BigDecimal.ONE);
        subscription.setCurrency("USD");
        subscription.setExpectedAmount(BigDecimal.ONE);
        subscription.setExpectedCurrency("USD");
        subscription.setCurrentPeriodEnd(LocalDateTime.now().plusDays(10));
        return subscription;
    }
}
