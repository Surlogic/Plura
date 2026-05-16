package com.plura.plurabackend.professional.plan;

import com.plura.plurabackend.core.billing.subscriptions.model.Subscription;
import com.plura.plurabackend.core.billing.subscriptions.model.SubscriptionStatus;
import com.plura.plurabackend.core.billing.subscriptions.repository.SubscriptionRepository;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;

/**
 * EffectiveProfessionalPlanService es un servicio de negocio del modulo profesionales / planes.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: subscriptionRepository, professionalPlanPolicyService.
 * Foco funcional: profesionales, servicios, planes.
 */
@Service
public class EffectiveProfessionalPlanService {

    private final SubscriptionRepository subscriptionRepository;
    private final ProfessionalPlanPolicyService professionalPlanPolicyService;

    public EffectiveProfessionalPlanService(
        SubscriptionRepository subscriptionRepository,
        ProfessionalPlanPolicyService professionalPlanPolicyService
    ) {
        this.subscriptionRepository = subscriptionRepository;
        this.professionalPlanPolicyService = professionalPlanPolicyService;
    }

    /**
     * Resuelve for profesional normalizando entradas, defaults y casos borde.
     */
    public EffectiveProfessionalPlan resolveForProfessional(ProfessionalProfile profile) {
        if (profile == null || profile.getId() == null) {
            return resolveDefault();
        }

        return subscriptionRepository.findByProfessionalId(profile.getId())
            .filter(this::isSubscriptionActiveForCapabilities)
            .map(subscription -> resolveDefault())
            .orElseGet(this::resolveDefault);
    }

    /**
     * Resuelve default normalizando entradas, defaults y casos borde.
     */
    public EffectiveProfessionalPlan resolveDefault() {
        ProfessionalPlanCode code = ProfessionalPlanCode.CORE;
        return new EffectiveProfessionalPlan(code, professionalPlanPolicyService.entitlementsFor(code));
    }

    /**
     * Evalua is subscription active for capabilities y devuelve una decision booleana para el llamador.
     */
    private boolean isSubscriptionActiveForCapabilities(Subscription subscription) {
        if (subscription == null || subscription.getStatus() != SubscriptionStatus.ACTIVE) {
            return false;
        }
        LocalDateTime currentPeriodEnd = subscription.getCurrentPeriodEnd();
        return currentPeriodEnd == null || !currentPeriodEnd.isBefore(LocalDateTime.now());
    }
}
