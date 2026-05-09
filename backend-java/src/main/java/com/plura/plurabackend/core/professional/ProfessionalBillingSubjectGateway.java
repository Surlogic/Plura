package com.plura.plurabackend.core.professional;

import com.plura.plurabackend.professional.model.ProfessionalProfile;
import java.util.Optional;

/**
 * ProfessionalBillingSubjectGateway es un contrato interno del modulo profesionales.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: profesionales, billing.
 */
public interface ProfessionalBillingSubjectGateway {

    ProfessionalProfile loadEnabledProfessionalByUserId(Long userId);

    Optional<ProfessionalProfile> findById(Long professionalId);

    Optional<ProfessionalProfile> findByEmailIgnoreCase(String email);
}
