package com.plura.plurabackend.professional.plan;

import com.plura.plurabackend.core.security.CurrentActorService;
import com.plura.plurabackend.professional.application.ProfessionalAccessSupport;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * PlanGuardService es un servicio de negocio del modulo profesionales / planes.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: currentActorService, professionalAccessSupport, effectiveProfessionalPlanService.
 * Foco funcional: servicios, planes.
 */
@Service
public class PlanGuardService {

    private final CurrentActorService currentActorService;
    private final ProfessionalAccessSupport professionalAccessSupport;
    private final EffectiveProfessionalPlanService effectiveProfessionalPlanService;

    public PlanGuardService(
        CurrentActorService currentActorService,
        ProfessionalAccessSupport professionalAccessSupport,
        EffectiveProfessionalPlanService effectiveProfessionalPlanService
    ) {
        this.currentActorService = currentActorService;
        this.professionalAccessSupport = professionalAccessSupport;
        this.effectiveProfessionalPlanService = effectiveProfessionalPlanService;
    }

    /**
     * Ejecuta la logica de effective plan for actual profesional manteniendola encapsulada en este componente.
     */
    public EffectiveProfessionalPlan effectivePlanForCurrentProfessional() {
        Long userId = currentActorService.currentProfessionalUserId();
        return effectivePlanForProfessionalUserId(String.valueOf(userId));
    }

    /**
     * Ejecuta la logica de entitlements for actual profesional manteniendola encapsulada en este componente.
     */
    public ProfessionalPlanEntitlements entitlementsForCurrentProfessional() {
        return effectivePlanForCurrentProfessional().entitlements();
    }

    /**
     * Ejecuta la logica de effective plan for profesional usuario ID manteniendola encapsulada en este componente.
     */
    public EffectiveProfessionalPlan effectivePlanForProfessionalUserId(String rawUserId) {
        ProfessionalProfile profile = professionalAccessSupport.loadProfessionalByUserId(rawUserId);
        return effectiveProfessionalPlanService.resolveForProfessional(profile);
    }

    /**
     * Ejecuta la logica de entitlements for profesional usuario ID manteniendola encapsulada en este componente.
     */
    public ProfessionalPlanEntitlements entitlementsForProfessionalUserId(String rawUserId) {
        return effectivePlanForProfessionalUserId(rawUserId).entitlements();
    }

    /**
     * Exige at least y corta la ejecucion si falta autorizacion o contexto.
     * Esta separacion hace explicita la regla de seguridad o negocio que protege el flujo.
     */
    public void requireAtLeast(ProfessionalPlanCode minimumPlan) {
        EffectiveProfessionalPlan effectivePlan = effectivePlanForCurrentProfessional();
        if (ProfessionalPlanRank.valueOf(effectivePlan.code()) < ProfessionalPlanRank.valueOf(minimumPlan)) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Tu plan actual no alcanza para esta funcionalidad"
            );
        }
    }

    /**
     * Exige boolean capability y corta la ejecucion si falta autorizacion o contexto.
     * Esta separacion hace explicita la regla de seguridad o negocio que protege el flujo.
     */
    public void requireBooleanCapability(BooleanCapability capability) {
        ProfessionalPlanEntitlements entitlements = entitlementsForCurrentProfessional();
        if (!capability.isEnabled(entitlements)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, capability.deniedMessage());
        }
    }

    /**
     * Exige boolean capability y corta la ejecucion si falta autorizacion o contexto.
     * Esta separacion hace explicita la regla de seguridad o negocio que protege el flujo.
     */
    public void requireBooleanCapability(String rawUserId, BooleanCapability capability) {
        ProfessionalPlanEntitlements entitlements = entitlementsForProfessionalUserId(rawUserId);
        if (!capability.isEnabled(entitlements)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, capability.deniedMessage());
        }
    }

    /**
     * Exige limit not exceeded y corta la ejecucion si falta autorizacion o contexto.
     * Esta separacion hace explicita la regla de seguridad o negocio que protege el flujo.
     */
    public void requireLimitNotExceeded(LimitCapability capability, long currentValue) {
        ProfessionalPlanEntitlements entitlements = entitlementsForCurrentProfessional();
        int limit = capability.resolveLimit(entitlements);
        if (currentValue > limit) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, capability.exceededMessage(limit));
        }
    }

    /**
     * Exige limit not exceeded y corta la ejecucion si falta autorizacion o contexto.
     * Esta separacion hace explicita la regla de seguridad o negocio que protege el flujo.
     */
    public void requireLimitNotExceeded(String rawUserId, LimitCapability capability, long currentValue) {
        ProfessionalPlanEntitlements entitlements = entitlementsForProfessionalUserId(rawUserId);
        int limit = capability.resolveLimit(entitlements);
        if (currentValue > limit) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, capability.exceededMessage(limit));
        }
    }

    /**
     * Exige publico perfil tier y corta la ejecucion si falta autorizacion o contexto.
     * Esta separacion hace explicita la regla de seguridad o negocio que protege el flujo.
     */
    public void requirePublicProfileTier(String rawUserId, PublicProfileTier minimumTier) {
        ProfessionalPlanEntitlements entitlements = entitlementsForProfessionalUserId(rawUserId);
        if (entitlements.publicProfileTier().compareTo(minimumTier) < 0) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Tu plan actual no permite personalizar ese nivel de perfil publico"
            );
        }
    }

    /**
     * Exige agenda rango y corta la ejecucion si falta autorizacion o contexto.
     * Esta separacion hace explicita la regla de seguridad o negocio que protege el flujo.
     */
    public void requireScheduleRange(String rawUserId, long requestedDays) {
        ProfessionalPlanEntitlements entitlements = entitlementsForProfessionalUserId(rawUserId);
        ScheduleTier scheduleTier = entitlements.scheduleTier();
        boolean allowed = switch (scheduleTier) {
            case DAILY -> requestedDays <= 1;
            case WEEKLY -> requestedDays <= 7;
            case MASTER -> true;
        };
        if (!allowed) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                switch (scheduleTier) {
                    case DAILY -> "Tu plan actual solo permite consultar agenda diaria";
                    case WEEKLY -> "Tu plan actual solo permite consultar agenda semanal";
                    case MASTER -> "Tu plan actual no permite ese rango";
                }
            );
        }
    }

    /**
     * Exige analytics tier y corta la ejecucion si falta autorizacion o contexto.
     * Esta separacion hace explicita la regla de seguridad o negocio que protege el flujo.
     */
    public void requireAnalyticsTier(String rawUserId, AnalyticsTier minimumTier) {
        ProfessionalPlanEntitlements entitlements = entitlementsForProfessionalUserId(rawUserId);
        if (entitlements.analyticsTier().compareTo(minimumTier) < 0) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Tu plan actual no permite ese nivel de analytics"
            );
        }
    }
}
