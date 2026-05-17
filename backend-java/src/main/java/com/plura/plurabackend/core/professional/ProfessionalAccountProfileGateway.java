package com.plura.plurabackend.core.professional;

import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import java.util.Optional;

/**
 * ProfessionalAccountProfileGateway es un contrato interno del modulo profesionales.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: profesionales, cuentas, perfiles.
 */
public interface ProfessionalAccountProfileGateway {

    ProfessionalProfile createRegisteredProfile(User user, ProfessionalProfileRegistrationCommand command);

    ProfessionalProfile activateProfile(User user, ProfessionalProfileRegistrationCommand command);

    ProfessionalProfile loadOrBootstrapProfile(User user);

    Optional<ProfessionalProfile> findByUserId(Long userId);
}
