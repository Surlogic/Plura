package com.plura.plurabackend.professional.profile;

import com.plura.plurabackend.core.common.util.SlugUtils;
import com.plura.plurabackend.core.professional.ProfessionalAccountProfileGateway;
import com.plura.plurabackend.core.professional.ProfessionalBillingSubjectGateway;
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

@Service
public class ProfessionalProfileGatewayService implements
    ProfessionalPublicReadFacade,
    ProfessionalAccountProfileGateway,
    ProfessionalBillingSubjectGateway {

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

    @Override
    public Optional<ProfessionalPublicSummary> findActiveSummaryBySlug(String slug) {
        return professionalProfileRepository.findBySlug(normalizeSlug(slug))
            .filter(this::isActive)
            .map(this::toSummary);
    }

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

    @Override
    public Optional<Long> findActiveProfessionalIdBySlug(String slug) {
        return professionalProfileRepository.findBySlug(normalizeSlug(slug))
            .filter(this::isActive)
            .map(ProfessionalProfile::getId);
    }

    @Override
    public ProfessionalProfile createRegisteredProfile(User user, ProfessionalProfileRegistrationCommand command) {
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setUser(user);
        profile.setCategories(command.categories());
        profile.setRubro(command.rubro());
        profile.setDisplayName(user.getFullName());
        profile.setSlug(SlugUtils.generateUniqueSlug(user.getFullName(), professionalProfileRepository::existsBySlug));
        profile.setCountry(command.country());
        profile.setCity(command.city());
        profile.setFullAddress(command.fullAddress());
        profile.setLocation(command.location());
        profile.setLocationText(command.location());
        profile.setLatitude(command.latitude());
        profile.setLongitude(command.longitude());
        profile.setTipoCliente(command.tipoCliente());
        ProfessionalProfile saved = professionalProfileRepository.save(profile);
        professionalProfileRepository.updateCoordinates(saved.getId(), command.latitude(), command.longitude());
        searchSyncPublisher.publishProfileChanged(saved.getId());
        return saved;
    }

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
    public ProfessionalProfile loadEnabledProfessionalByUserId(Long userId) {
        ProfessionalProfile professional = professionalProfileRepository.findByUser_Id(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Perfil profesional no encontrado"));
        if (!isActive(professional)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Profesional inhabilitado");
        }
        return professional;
    }

    @Override
    public Optional<ProfessionalProfile> findById(Long professionalId) {
        return professionalProfileRepository.findById(professionalId);
    }

    @Override
    public Optional<ProfessionalProfile> findByEmailIgnoreCase(String email) {
        if (email == null || email.isBlank()) {
            return Optional.empty();
        }
        return professionalProfileRepository.findByUser_EmailIgnoreCase(email.trim());
    }

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
            response.getLogoUrl()
        );
    }

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

    private boolean isActive(ProfessionalProfile profile) {
        return profile != null && !Boolean.FALSE.equals(profile.getActive());
    }

    private String normalizeSlug(String slug) {
        return slug == null ? "" : slug.trim().toLowerCase(java.util.Locale.ROOT);
    }
}
