package com.plura.plurabackend.professional.profile;

import com.plura.plurabackend.core.professional.ProfessionalAccountLifecycleGateway;
import com.plura.plurabackend.core.professional.ProfessionalAccountSubject;
import com.plura.plurabackend.core.storage.ImageCleanupService;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.photo.model.BusinessPhoto;
import com.plura.plurabackend.professional.photo.repository.BusinessPhotoRepository;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import com.plura.plurabackend.professional.service.model.ProfesionalService;
import com.plura.plurabackend.professional.service.repository.ProfesionalServiceRepository;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * ProfessionalAccountLifecycleGatewayService es un servicio de negocio del modulo profesionales / perfil.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: professionalProfileRepository, profesionalServiceRepository, businessPhotoRepository, imageCleanupService.
 * Foco funcional: profesionales, cuentas, servicios.
 */
@Service
public class ProfessionalAccountLifecycleGatewayService implements ProfessionalAccountLifecycleGateway {

    private static final Logger LOGGER = LoggerFactory.getLogger(ProfessionalAccountLifecycleGatewayService.class);

    private final ProfessionalProfileRepository professionalProfileRepository;
    private final ProfesionalServiceRepository profesionalServiceRepository;
    private final BusinessPhotoRepository businessPhotoRepository;
    private final ImageCleanupService imageCleanupService;

    public ProfessionalAccountLifecycleGatewayService(
        ProfessionalProfileRepository professionalProfileRepository,
        ProfesionalServiceRepository profesionalServiceRepository,
        BusinessPhotoRepository businessPhotoRepository,
        ImageCleanupService imageCleanupService
    ) {
        this.professionalProfileRepository = professionalProfileRepository;
        this.profesionalServiceRepository = profesionalServiceRepository;
        this.businessPhotoRepository = businessPhotoRepository;
        this.imageCleanupService = imageCleanupService;
    }

    /**
     * Busca by usuario ID aplicando filtros, joins o criterios del caso de uso.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
    @Override
    public Optional<ProfessionalAccountSubject> findByUserId(Long userId) {
        if (userId == null) {
            return Optional.empty();
        }
        return professionalProfileRepository.findByUser_Id(userId)
            .map(profile -> new ProfessionalAccountSubject(profile.getId(), profile.getSlug()));
    }

    /**
     * Ejecuta la logica de deactivate profesional perfil manteniendola encapsulada en este componente.
     */
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

    /**
     * Ejecuta la logica de clear profesional coordinates manteniendola encapsulada en este componente.
     */
    @Override
    public void clearProfessionalCoordinates(Long professionalId) {
        professionalProfileRepository.updateCoordinates(professionalId, null, null);
    }

    /**
     * Ejecuta la logica de deactivate servicios by profesional ID manteniendola encapsulada en este componente.
     */
    @Override
    public void deactivateServicesByProfessionalId(Long professionalId) {
        profesionalServiceRepository.deactivateByProfessionalId(professionalId);
    }

    /**
     * Ejecuta la logica de cleanup profesional media manteniendola encapsulada en este componente.
     */
    @Override
    public void cleanupProfessionalMedia(Long professionalId) {
        if (professionalId == null) {
            return;
        }

        LOGGER.info("Iniciando limpieza de media para profesional {}", professionalId);

        // 1. Collect and delete profile images (logo, banner, gallery)
        professionalProfileRepository.findById(professionalId).ifPresent(profile -> {
            imageCleanupService.deleteIfRemoved(profile.getLogoUrl());
            imageCleanupService.deleteIfRemoved(profile.getBannerUrl());

            if (profile.getPublicPhotos() != null) {
                for (String photoUrl : profile.getPublicPhotos()) {
                    imageCleanupService.deleteIfRemoved(photoUrl);
                }
            }
        });

        // 2. Collect and delete service images
        List<ProfesionalService> services = profesionalServiceRepository
            .findByProfessional_IdOrderByCreatedAtDesc(professionalId);
        for (ProfesionalService service : services) {
            imageCleanupService.deleteIfRemoved(service.getImageUrl());
        }

        // 3. Collect and delete business photo images, then remove records
        List<BusinessPhoto> businessPhotos = businessPhotoRepository.findByProfessional_Id(professionalId);
        for (BusinessPhoto photo : businessPhotos) {
            imageCleanupService.deleteIfRemoved(photo.getUrl());
        }
        businessPhotoRepository.deleteByProfessional_Id(professionalId);

        LOGGER.info("Limpieza de media completada para profesional {}", professionalId);
    }

    /**
     * Aplica deactivation sobre el modelo actual manteniendo consistencia.
     */
    private void applyDeactivation(ProfessionalProfile profile) {
        profile.setActive(false);
        profile.setDisplayName("Cuenta eliminada");
        profile.setRubro("Cuenta eliminada");
        profile.setPublicHeadline(null);
        profile.setPublicAbout(null);
        profile.setLogoUrl(null);
        profile.setBannerUrl(null);
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
