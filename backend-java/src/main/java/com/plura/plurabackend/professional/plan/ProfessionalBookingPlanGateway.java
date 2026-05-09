package com.plura.plurabackend.professional.plan;

import com.plura.plurabackend.core.booking.bridge.BookingProfessionalPlanGateway;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * ProfessionalBookingPlanGateway es un gateway interno del modulo profesionales / planes.
 * Responsabilidad: desacoplar un modulo consumidor de la implementacion real de otro modulo.
 * Colabora con: professionalProfileRepository, effectiveProfessionalPlanService.
 * Foco funcional: profesionales, reservas, planes.
 */
@Service
public class ProfessionalBookingPlanGateway implements BookingProfessionalPlanGateway {

    private final ProfessionalProfileRepository professionalProfileRepository;
    private final EffectiveProfessionalPlanService effectiveProfessionalPlanService;

    public ProfessionalBookingPlanGateway(
        ProfessionalProfileRepository professionalProfileRepository,
        EffectiveProfessionalPlanService effectiveProfessionalPlanService
    ) {
        this.professionalProfileRepository = professionalProfileRepository;
        this.effectiveProfessionalPlanService = effectiveProfessionalPlanService;
    }

    /**
     * Ejecuta la logica de allows online payments manteniendola encapsulada en este componente.
     */
    @Override
    public boolean allowsOnlinePayments(Long professionalId) {
        if (professionalId == null) {
            return false;
        }
        return professionalProfileRepository.findById(professionalId)
            .map(effectiveProfessionalPlanService::resolveForProfessional)
            .map(EffectiveProfessionalPlan::entitlements)
            .map(ProfessionalPlanEntitlements::allowOnlinePayments)
            .orElse(false);
    }
}
