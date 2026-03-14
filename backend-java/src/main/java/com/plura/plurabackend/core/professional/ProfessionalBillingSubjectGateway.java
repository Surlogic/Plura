package com.plura.plurabackend.core.professional;

import com.plura.plurabackend.professional.model.ProfessionalProfile;
import java.util.Optional;

public interface ProfessionalBillingSubjectGateway {

    ProfessionalProfile loadEnabledProfessionalByUserId(Long userId);

    Optional<ProfessionalProfile> findById(Long professionalId);

    Optional<ProfessionalProfile> findByEmailIgnoreCase(String email);
}
