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

/**
 * ProfessionalAccessSupport es un componente de dominio del modulo profesionales / aplicacion.
 * Responsabilidad: encapsular comportamiento propio del modulo y mantenerlo fuera de controllers u otras capas.
 * Colabora con: professionalProfileRepository, userRepository.
 * Foco funcional: profesionales.
 */
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

    /**
     * Carga la seccion profesional by usuario ID desde base de datos o datos agregados y la deja lista para la respuesta.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
    public ProfessionalProfile loadProfessionalByUserId(String rawUserId) {
        Long userId = parseUserId(rawUserId);
        ProfessionalProfile profile = professionalProfileRepository.findByUser_Id(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profesional no encontrado"));
        if (profile.getUser() == null || profile.getUser().getDeletedAt() != null || !Boolean.TRUE.equals(profile.getActive())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Profesional inhabilitado");
        }
        return profile;
    }

    /**
     * Carga la seccion cliente by usuario ID desde base de datos o datos agregados y la deja lista para la respuesta.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
    public User loadClientByUserId(String rawUserId) {
        Long userId = parseUserId(rawUserId);
        User user = userRepository.findByIdAndDeletedAtIsNull(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cliente no encontrado"));
        if (user.getRole() != UserRole.USER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo clientes");
        }
        return user;
    }

    /**
     * Carga la seccion active usuario desde base de datos o datos agregados y la deja lista para la respuesta.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
    public User loadActiveUser(String rawUserId, String notFoundMessage) {
        Long userId = parseUserId(rawUserId);
        return userRepository.findByIdAndDeletedAtIsNull(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, notFoundMessage));
    }

    /**
     * Parsea usuario ID y convierte errores de formato en errores controlados.
     */
    public Long parseUserId(String rawUserId) {
        try {
            return Long.valueOf(rawUserId);
        } catch (NumberFormatException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesión inválida");
        }
    }

    /**
     * Ejecuta la logica de ensure slug manteniendola encapsulada en este componente.
     */
    public void ensureSlug(ProfessionalProfile profile) {
        if (profile.getSlug() != null && !profile.getSlug().isBlank()) {
            return;
        }
        String fullName = profile.getUser() == null ? "profesional" : profile.getUser().getFullName();
        String slug = SlugUtils.generateUniqueSlug(fullName, professionalProfileRepository::existsBySlug);
        profile.setSlug(slug);
    }

    /**
     * Ejecuta la logica de ensure publico profesional is activos manteniendola encapsulada en este componente.
     */
    public void ensurePublicProfessionalIsActive(ProfessionalProfile profile) {
        if (!Boolean.FALSE.equals(profile.getActive())) {
            return;
        }
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Profesional no encontrado");
    }

    /**
     * Ejecuta la logica de ensure profesional reservable manteniendola encapsulada en este componente.
     */
    public void ensureProfessionalReservable(ProfessionalProfile profile) {
        if (!Boolean.FALSE.equals(profile.getActive())) {
            return;
        }
        throw new ResponseStatusException(HttpStatus.CONFLICT, "El profesional está inactivo.");
    }

    /**
     * Ejecuta la logica de ensure servicio reservable manteniendola encapsulada en este componente.
     */
    public void ensureServiceReservable(ProfesionalService service) {
        if (!Boolean.FALSE.equals(service.getActive())) {
            return;
        }
        throw new ResponseStatusException(HttpStatus.CONFLICT, "El servicio está inactivo.");
    }
}
