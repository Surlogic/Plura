package com.plura.plurabackend.core.professional;

import java.util.Optional;

public interface ProfessionalAccountLifecycleGateway {

    Optional<ProfessionalAccountSubject> findByUserId(Long userId);

    void deactivateProfessionalProfile(ProfessionalAccountSubject subject);

    void clearProfessionalCoordinates(Long professionalId);

    void deactivateServicesByProfessionalId(Long professionalId);
}
