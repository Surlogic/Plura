package com.plura.plurabackend.professional.profile;

import com.plura.plurabackend.core.professional.ProfessionalAccountLifecycleGateway;
import com.plura.plurabackend.core.professional.ProfessionalAccountSubject;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import com.plura.plurabackend.professional.service.repository.ProfesionalServiceRepository;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class ProfessionalAccountLifecycleGatewayService implements ProfessionalAccountLifecycleGateway {

    private final ProfessionalProfileRepository professionalProfileRepository;
    private final ProfesionalServiceRepository profesionalServiceRepository;

    public ProfessionalAccountLifecycleGatewayService(
        ProfessionalProfileRepository professionalProfileRepository,
        ProfesionalServiceRepository profesionalServiceRepository
    ) {
        this.professionalProfileRepository = professionalProfileRepository;
        this.profesionalServiceRepository = profesionalServiceRepository;
    }

    @Override
    public Optional<ProfessionalAccountSubject> findByUserId(Long userId) {
        if (userId == null) {
            return Optional.empty();
        }
        return professionalProfileRepository.findByUser_Id(userId)
            .map(profile -> new ProfessionalAccountSubject(profile.getId(), profile.getSlug()));
    }

    @Override
    public void deactivateProfessionalProfile(ProfessionalAccountSubject subject) {
        if (subject == null || subject.professionalId() == null) {
            return;
        }
        professionalProfileRepository.findById(subject.professionalId()).ifPresent(profile -> {
            applyDeactivation(profile);
            professionalProfileRepository.save(profile);
        });
    }

    @Override
    public void clearProfessionalCoordinates(Long professionalId) {
        professionalProfileRepository.updateCoordinates(professionalId, null, null);
    }

    @Override
    public void deactivateServicesByProfessionalId(Long professionalId) {
        profesionalServiceRepository.deactivateByProfessionalId(professionalId);
    }

    private void applyDeactivation(ProfessionalProfile profile) {
        profile.setActive(false);
        profile.setDisplayName("Cuenta eliminada");
        profile.setRubro("Cuenta eliminada");
        profile.setPublicHeadline(null);
        profile.setPublicAbout(null);
        profile.setLogoUrl(null);
        profile.setInstagram(null);
        profile.setFacebook(null);
        profile.setTiktok(null);
        profile.setWebsite(null);
        profile.setWhatsapp(null);
        profile.setLocation(null);
        profile.setCountry(null);
        profile.setCity(null);
        profile.setFullAddress(null);
        profile.setLocationText(null);
        profile.setLatitude(null);
        profile.setLongitude(null);
        profile.setTipoCliente(null);
        profile.setScheduleJson(null);
        profile.setHasAvailabilityToday(false);
        profile.setNextAvailableAt(null);
        profile.setPublicPhotos(new ArrayList<>());
        profile.setCategories(new HashSet<>());
    }
}
