package com.plura.plurabackend.core.professional;

import java.util.Optional;

public interface ProfessionalAccountLifecycleGateway {

    Optional<ProfessionalAccountSubject> findByUserId(Long userId);

    void deactivateProfessionalProfile(ProfessionalAccountSubject subject);

    void clearProfessionalCoordinates(Long professionalId);

    void deactivateServicesByProfessionalId(Long professionalId);

    /**
     * Deletes all media objects from storage (R2/local) and removes business photo records
     * for a professional: logo, banner, gallery photos, service images, and business photos.
     * Must be called BEFORE deactivateProfessionalProfile, while URLs are still readable.
     */
    void cleanupProfessionalMedia(Long professionalId);
}
