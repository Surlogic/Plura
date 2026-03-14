package com.plura.plurabackend.professional.application;

import com.plura.plurabackend.core.common.util.SlugUtils;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import com.plura.plurabackend.professional.service.model.ProfesionalService;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.model.UserRole;
import com.plura.plurabackend.core.user.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class ProfessionalAccessSupport {

    private final ProfessionalProfileRepository professionalProfileRepository;
    private final UserRepository userRepository;

    public ProfessionalAccessSupport(
        ProfessionalProfileRepository professionalProfileRepository,
        UserRepository userRepository
    ) {
        this.professionalProfileRepository = professionalProfileRepository;
        this.userRepository = userRepository;
    }

    public ProfessionalProfile loadProfessionalByUserId(String rawUserId) {
        Long userId = parseUserId(rawUserId);
        ProfessionalProfile profile = professionalProfileRepository.findByUser_Id(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profesional no encontrado"));
        if (profile.getUser() == null || profile.getUser().getDeletedAt() != null || !Boolean.TRUE.equals(profile.getActive())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Profesional inhabilitado");
        }
        return profile;
    }

    public User loadClientByUserId(String rawUserId) {
        Long userId = parseUserId(rawUserId);
        User user = userRepository.findByIdAndDeletedAtIsNull(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cliente no encontrado"));
        if (user.getRole() != UserRole.USER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo clientes");
        }
        return user;
    }

    public User loadActiveUser(String rawUserId, String notFoundMessage) {
        Long userId = parseUserId(rawUserId);
        return userRepository.findByIdAndDeletedAtIsNull(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, notFoundMessage));
    }

    public Long parseUserId(String rawUserId) {
        try {
            return Long.valueOf(rawUserId);
        } catch (NumberFormatException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesión inválida");
        }
    }

    public void ensureSlug(ProfessionalProfile profile) {
        if (profile.getSlug() != null && !profile.getSlug().isBlank()) {
            return;
        }
        String fullName = profile.getUser() == null ? "profesional" : profile.getUser().getFullName();
        String slug = SlugUtils.generateUniqueSlug(fullName, professionalProfileRepository::existsBySlug);
        profile.setSlug(slug);
    }

    public void ensurePublicProfessionalIsActive(ProfessionalProfile profile) {
        if (!Boolean.FALSE.equals(profile.getActive())) {
            return;
        }
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Profesional no encontrado");
    }

    public void ensureProfessionalReservable(ProfessionalProfile profile) {
        if (!Boolean.FALSE.equals(profile.getActive())) {
            return;
        }
        throw new ResponseStatusException(HttpStatus.CONFLICT, "El profesional está inactivo.");
    }

    public void ensureServiceReservable(ProfesionalService service) {
        if (!Boolean.FALSE.equals(service.getActive())) {
            return;
        }
        throw new ResponseStatusException(HttpStatus.CONFLICT, "El servicio está inactivo.");
    }
}
