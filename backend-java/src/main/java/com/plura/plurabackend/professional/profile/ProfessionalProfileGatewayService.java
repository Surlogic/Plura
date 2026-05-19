package com.plura.plurabackend.professional.profile;

import com.plura.plurabackend.core.common.util.SlugUtils;
import com.plura.plurabackend.core.professional.ProfessionalAccountProfileGateway;
import com.plura.plurabackend.core.professional.ProfessionalBillingSubjectGateway;
import com.plura.plurabackend.core.professional.ProfessionalNotificationRecipient;
import com.plura.plurabackend.core.professional.ProfessionalNotificationRecipientGateway;
import com.plura.plurabackend.core.professional.ProfessionalProfileRegistrationCommand;
import com.plura.plurabackend.core.professional.ProfessionalPublicReadFacade;
import com.plura.plurabackend.core.professional.ProfessionalPublicSummary;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.professional.dto.ProfesionalPublicSummaryResponse;
import com.plura.plurabackend.professional.application.ProfilePublicPageAssembler;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import com.plura.plurabackend.core.search.engine.SearchSyncPublisher;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * ProfessionalProfileGatewayService es un servicio de negocio del modulo profesionales / perfil.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: professionalProfileRepository, professionalCategorySupport, profilePublicPageAssembler, searchSyncPublisher.
 * Foco funcional: profesionales, perfiles, servicios.
 */
@Service
public class ProfessionalProfileGatewayService implements
    ProfessionalPublicReadFacade,
    ProfessionalAccountProfileGateway,
    ProfessionalBillingSubjectGateway,
    ProfessionalNotificationRecipientGateway {

    private final ProfessionalProfileRepository professionalProfileRepository;
    private final ProfessionalCategorySupport professionalCategorySupport;
    private final ProfilePublicPageAssembler profilePublicPageAssembler;
    private final SearchSyncPublisher searchSyncPublisher;

    public ProfessionalProfileGatewayService(
        ProfessionalProfileRepository professionalProfileRepository,
        ProfessionalCategorySupport professionalCategorySupport,
        ProfilePublicPageAssembler profilePublicPageAssembler,
        SearchSyncPublisher searchSyncPublisher
    ) {
        this.professionalProfileRepository = professionalProfileRepository;
        this.professionalCategorySupport = professionalCategorySupport;
        this.profilePublicPageAssembler = profilePublicPageAssembler;
        this.searchSyncPublisher = searchSyncPublisher;
    }

    /**
     * Busca active resumen by slug aplicando filtros, joins o criterios del caso de uso.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
    @Override
    public Optional<ProfessionalPublicSummary> findActiveSummaryBySlug(String slug) {
        return professionalProfileRepository.findBySlug(normalizeSlug(slug))
            .filter(this::isActive)
            .map(this::toSummary);
    }

    /**
     * Busca active summaries by IDs aplicando filtros, joins o criterios del caso de uso.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
    @Override
    public Map<Long, ProfessionalPublicSummary> findActiveSummariesByIds(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Map.of();
        }
        Map<Long, ProfessionalPublicSummary> summaries = new LinkedHashMap<>();
        professionalProfileRepository.findByIdInAndActiveTrueWithRelations(ids).forEach(profile ->
            summaries.put(profile.getId(), toSummary(profile))
        );
        return summaries;
    }

    /**
     * Busca active profesional ID by slug aplicando filtros, joins o criterios del caso de uso.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
    @Override
    public Optional<Long> findActiveProfessionalIdBySlug(String slug) {
        return professionalProfileRepository.findBySlug(normalizeSlug(slug))
            .filter(this::isActive)
            .map(ProfessionalProfile::getId);
    }

    /**
     * Crea registered perfil validando datos de entrada y persistiendo el resultado.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    @Override
    public ProfessionalProfile createRegisteredProfile(User user, ProfessionalProfileRegistrationCommand command) {
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setUser(user);
        applyRegistrationCommand(profile, user, command);
        profile.setSlug(SlugUtils.generateUniqueSlug(user.getFullName(), professionalProfileRepository::existsBySlug));
        ProfessionalProfile saved = saveActivatedProfile(profile, command);
        return saved;
    }

    @Override
    public ProfessionalProfile activateProfile(User user, ProfessionalProfileRegistrationCommand command) {
        ProfessionalProfile profile = professionalProfileRepository.findByUser_Id(user.getId()).orElse(null);
        if (profile == null) {
            return createRegisteredProfile(user, command);
        }
        if (isActive(profile)) {
            return profile;
        }

        applyRegistrationCommand(profile, user, command);
        if (profile.getSlug() == null || profile.getSlug().isBlank()) {
            profile.setSlug(SlugUtils.generateUniqueSlug(user.getFullName(), professionalProfileRepository::existsBySlug));
        }
        return saveActivatedProfile(profile, command);
    }

    private void applyRegistrationCommand(
        ProfessionalProfile profile,
        User user,
        ProfessionalProfileRegistrationCommand command
    ) {
        profile.setCategories(command.categories());
        profile.setRubro(command.rubro());
        profile.setDisplayName(user.getFullName());
        profile.setCountry(command.country());
        profile.setCity(command.city());
        profile.setFullAddress(command.fullAddress());
        profile.setLocation(command.location());
        profile.setLocationText(command.location());
        profile.setLatitude(command.latitude());
        profile.setLongitude(command.longitude());
        profile.setTipoCliente(command.tipoCliente());
        if (command.phoneNumber() != null) {
            profile.setWhatsapp(command.phoneNumber());
        }
        profile.setActive(true);
    }

    private ProfessionalProfile saveActivatedProfile(
        ProfessionalProfile profile,
        ProfessionalProfileRegistrationCommand command
    ) {
        ProfessionalProfile saved = professionalProfileRepository.save(profile);
        if (command.latitude() != null || command.longitude() != null) {
            professionalProfileRepository.updateCoordinates(saved.getId(), command.latitude(), command.longitude());
        }
        searchSyncPublisher.publishProfileChanged(saved.getId());
        return saved;
    }

    /**
     * Carga la seccion or bootstrap perfil desde base de datos o datos agregados y la deja lista para la respuesta.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
    @Override
    public ProfessionalProfile loadOrBootstrapProfile(User user) {
        ProfessionalProfile profile = professionalProfileRepository.findByUser_Id(user.getId())
            .orElseGet(() -> bootstrapMissingProfessionalProfile(user));

        if (profile.getSlug() == null || profile.getSlug().isBlank()) {
            profile.setSlug(SlugUtils.generateUniqueSlug(user.getFullName(), professionalProfileRepository::existsBySlug));
            profile = professionalProfileRepository.save(profile);
            searchSyncPublisher.publishProfileChanged(profile.getId());
        }

        return profile;
    }

    @Override
    public Optional<ProfessionalProfile> findByUserId(Long userId) {
        if (userId == null) {
            return Optional.empty();
        }
        return professionalProfileRepository.findByUser_Id(userId);
    }

    @Override
    public Optional<ProfessionalProfile> findActiveByPhoneNumber(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.isBlank()) {
            return Optional.empty();
        }
        return professionalProfileRepository.findFirstByWhatsappAndActiveTrue(phoneNumber);
    }

    /**
     * Carga la seccion enabled profesional by usuario ID desde base de datos o datos agregados y la deja lista para la respuesta.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
    @Override
    public ProfessionalProfile loadEnabledProfessionalByUserId(Long userId) {
        ProfessionalProfile professional = professionalProfileRepository.findByUser_Id(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Perfil profesional no encontrado"));
        if (!isActive(professional)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Profesional inhabilitado");
        }
        return professional;
    }

    /**
     * Busca by ID aplicando filtros, joins o criterios del caso de uso.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
    @Override
    public Optional<ProfessionalProfile> findById(Long professionalId) {
        return professionalProfileRepository.findById(professionalId);
    }

    /**
     * Busca by email ignore case aplicando filtros, joins o criterios del caso de uso.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
    @Override
    public Optional<ProfessionalProfile> findByEmailIgnoreCase(String email) {
        if (email == null || email.isBlank()) {
            return Optional.empty();
        }
        return professionalProfileRepository.findByUser_EmailIgnoreCase(email.trim());
    }

    /**
     * Busca notificacion destinatario by profesional ID aplicando filtros, joins o criterios del caso de uso.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
    @Override
    public Optional<ProfessionalNotificationRecipient> findNotificationRecipientByProfessionalId(Long professionalId) {
        if (professionalId == null) {
            return Optional.empty();
        }
        return professionalProfileRepository.findById(professionalId)
            .map(profile -> new ProfessionalNotificationRecipient(
                profile.getId(),
                profile.getUser() == null ? null : profile.getUser().getEmail(),
                profile.getUser() == null ? profile.getDisplayName() : profile.getUser().getFullName()
            ));
    }

    /**
     * Convierte datos internos al formato resumen esperado por el consumidor.
     */
    private ProfessionalPublicSummary toSummary(ProfessionalProfile profile) {
        ProfesionalPublicSummaryResponse response = profilePublicPageAssembler.toSummary(profile);
        return new ProfessionalPublicSummary(
            profile.getId(),
            response.getSlug(),
            response.getFullName(),
            response.getRubro(),
            response.getLocation(),
            response.getHeadline(),
            response.getCategories(),
            response.getLogoUrl(),
            response.getRating(),
            response.getReviewsCount()
        );
    }

    /**
     * Ejecuta la logica de bootstrap missing profesional perfil manteniendola encapsulada en este componente.
     */
    private ProfessionalProfile bootstrapMissingProfessionalProfile(User user) {
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setUser(user);
        profile.setRubro("Profesional");
        profile.setDisplayName(user.getFullName());
        profile.setSlug(
            SlugUtils.generateUniqueSlug(user.getFullName(), professionalProfileRepository::existsBySlug)
        );
        profile.setTipoCliente("SIN_LOCAL");
        profile.setCountry(null);
        profile.setCity(null);
        profile.setFullAddress(null);
        profile.setLocation(null);
        profile.setLocationText(null);
        profile.setLatitude(null);
        profile.setLongitude(null);
        profile.setActive(true);

        try {
            ProfessionalProfile created = professionalProfileRepository.save(profile);
            searchSyncPublisher.publishProfileChanged(created.getId());
            return created;
        } catch (DataIntegrityViolationException exception) {
            return professionalProfileRepository.findByUser_Id(user.getId())
                .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "No se pudo inicializar el perfil profesional"
                ));
        }
    }

    /**
     * Evalua is active y devuelve una decision booleana para el llamador.
     */
    private boolean isActive(ProfessionalProfile profile) {
        return profile != null && !Boolean.FALSE.equals(profile.getActive());
    }

    /**
     * Normaliza slug para evitar variantes vacias, invalidas o inconsistentes.
     */
    private String normalizeSlug(String slug) {
        return slug == null ? "" : slug.trim().toLowerCase(java.util.Locale.ROOT);
    }
}
