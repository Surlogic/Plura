package com.plura.plurabackend.professional.plan;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.core.billing.payments.model.PaymentProvider;
import com.plura.plurabackend.core.billing.subscriptions.model.Subscription;
import com.plura.plurabackend.core.billing.subscriptions.model.SubscriptionPlanCode;
import com.plura.plurabackend.core.billing.subscriptions.model.SubscriptionStatus;
import com.plura.plurabackend.core.billing.subscriptions.repository.SubscriptionRepository;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class EffectiveProfessionalPlanServiceTest {

    private final SubscriptionRepository subscriptionRepository = mock(SubscriptionRepository.class);
    private final ProfessionalPlanPolicyService policyService = new ProfessionalPlanPolicyService();
    private final EffectiveProfessionalPlanService service = new EffectiveProfessionalPlanService(
        subscriptionRepository,
        policyService
    );

    @Test
    void resolvesBasicWhenThereIsNoSubscription() {
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(10L);
        when(subscriptionRepository.findByProfessionalId(10L)).thenReturn(Optional.empty());

        EffectiveProfessionalPlan effectivePlan = service.resolveForProfessional(profile);

        assertEquals(ProfessionalPlanCode.BASIC, effectivePlan.code());
    }

    @Test
    void resolvesProfesionalForActiveNewAliasPlanCode() {
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(20L);
        when(subscriptionRepository.findByProfessionalId(20L))
            .thenReturn(Optional.of(activeSubscription(SubscriptionPlanCode.PLAN_PROFESIONAL)));

        EffectiveProfessionalPlan effectivePlan = service.resolveForProfessional(profile);

        assertEquals(ProfessionalPlanCode.PROFESIONAL, effectivePlan.code());
        assertTrue(effectivePlan.entitlements().allowOnlinePayments());
    }

    @Test
    void resolvesEnterpriseForPremiumPlan() {
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(30L);
        when(subscriptionRepository.findByProfessionalId(30L))
            .thenReturn(Optional.of(activeSubscription(SubscriptionPlanCode.PLAN_ENTERPRISE)));

        EffectiveProfessionalPlan effectivePlan = service.resolveForProfessional(profile);

        assertEquals(ProfessionalPlanCode.ENTERPRISE, effectivePlan.code());
        assertTrue(effectivePlan.entitlements().allowStore());
        assertTrue(effectivePlan.entitlements().allowPortfolio());
    }

    @Test
    void fallsBackToBasicWhenSubscriptionIsInactive() {
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(40L);
        Subscription subscription = activeSubscription(SubscriptionPlanCode.PLAN_ENTERPRISE);
        subscription.setStatus(SubscriptionStatus.CANCELLED);
        when(subscriptionRepository.findByProfessionalId(40L)).thenReturn(Optional.of(subscription));

        EffectiveProfessionalPlan effectivePlan = service.resolveForProfessional(profile);

        assertEquals(ProfessionalPlanCode.BASIC, effectivePlan.code());
    }

    private Subscription activeSubscription(SubscriptionPlanCode plan) {
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
