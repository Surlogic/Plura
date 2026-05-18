package com.plura.plurabackend.core.security;

import com.plura.plurabackend.core.auth.context.AuthContextType;
import com.plura.plurabackend.core.professional.ProfessionalAccountProfileGateway;
import com.plura.plurabackend.core.security.jwt.AuthenticatedTokenDetails;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.model.UserRole;
import com.plura.plurabackend.core.user.repository.UserRepository;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * CurrentActorService es un servicio de negocio del modulo seguridad.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: servicios.
 */
@Service
public class CurrentActorService {

    private final ProfessionalAccountProfileGateway professionalAccountProfileGateway;
    private final UserRepository userRepository;

    public CurrentActorService(
        ProfessionalAccountProfileGateway professionalAccountProfileGateway,
        UserRepository userRepository
    ) {
        this.professionalAccountProfileGateway = professionalAccountProfileGateway;
        this.userRepository = userRepository;
    }

    /**
     * Exige authentication y corta la ejecucion si falta autorizacion o contexto.
     * Esta separacion hace explicita la regla de seguridad o negocio que protege el flujo.
     */
    public Authentication requireAuthentication() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sin sesión activa");
        }
        return authentication;
    }

    /**
     * Ejecuta la logica de actual usuario ID manteniendola encapsulada en este componente.
     */
    public Long currentUserId() {
        Authentication authentication = requireAuthentication();
        try {
            return Long.parseLong(authentication.getPrincipal().toString());
        } catch (NumberFormatException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token inválido");
        }
    }

    /**
     * Ejecuta la logica de actual rol manteniendola encapsulada en este componente.
     */
    public UserRole currentRole() {
        Authentication authentication = requireAuthentication();
        boolean isProfessional = authentication.getAuthorities().stream()
            .anyMatch(authority -> "ROLE_PROFESSIONAL".equals(authority.getAuthority()));
        if (isProfessional) {
            return UserRole.PROFESSIONAL;
        }

        boolean isUser = authentication.getAuthorities().stream()
            .anyMatch(authority -> "ROLE_USER".equals(authority.getAuthority()));
        if (isUser) {
            return UserRole.USER;
        }

        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Rol inválido");
    }

    /**
     * Ejecuta la logica de actual contexto tipo manteniendola encapsulada en este componente.
     */
    public AuthContextType currentContextType() {
        AuthenticatedTokenDetails details = currentTokenDetails();
        if (details != null && details.contextType() != null) {
            return details.contextType();
        }
        UserRole role = currentRole();
        return role == UserRole.PROFESSIONAL ? AuthContextType.PROFESSIONAL : AuthContextType.CLIENT;
    }

    /**
     * Obtiene el usuario profesional autenticado desde el contexto de seguridad actual.
     */
    public Long currentProfessionalUserId() {
        AuthContextType ctx = currentContextType();
        if (ctx != AuthContextType.PROFESSIONAL) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo profesionales");
        }
        Long userId = currentUserId();
        ProfessionalProfile profile = professionalAccountProfileGateway.findByUserId(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Perfil profesional no encontrado"));
        if (!Boolean.TRUE.equals(profile.getActive())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Profesional inhabilitado");
        }
        return userId;
    }

    /**
     * Ejecuta la logica de actual cliente usuario ID manteniendola encapsulada en este componente.
     */
    public Long currentClientUserId() {
        AuthContextType ctx = currentContextType();
        if (ctx != AuthContextType.CLIENT) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo clientes");
        }
        Long userId = currentUserId();
        User user = userRepository.findByIdAndDeletedAtIsNull(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));
        if (Boolean.FALSE.equals(user.getClientActive())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Perfil cliente inhabilitado");
        }
        return userId;
    }

    /**
     * Ejecuta la logica de actual trabajador ID manteniendola encapsulada en este componente.
     */
    public Long currentWorkerId() {
        AuthenticatedTokenDetails details = currentTokenDetails();
        if (details == null || details.contextType() != AuthContextType.WORKER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo trabajadores");
        }
        String workerId = details.workerId();
        if (workerId == null || workerId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Token sin trabajador");
        }
        try {
            return Long.parseLong(workerId);
        } catch (NumberFormatException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token inválido");
        }
    }

    /**
     * Ejecuta la logica de actual trabajador profesional ID manteniendola encapsulada en este componente.
     */
    public Long currentWorkerProfessionalId() {
        AuthenticatedTokenDetails details = currentTokenDetails();
        if (details == null || details.contextType() != AuthContextType.WORKER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo trabajadores");
        }
        String professionalId = details.professionalId();
        if (professionalId == null || professionalId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Token sin local");
        }
        try {
            return Long.parseLong(professionalId);
        } catch (NumberFormatException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token inválido");
        }
    }

    /**
     * Ejecuta la logica de actual token details manteniendola encapsulada en este componente.
     */
    public AuthenticatedTokenDetails currentTokenDetails() {
        Authentication authentication = requireAuthentication();
        Object details = authentication.getDetails();
        if (details instanceof AuthenticatedTokenDetails authenticatedTokenDetails) {
            return authenticatedTokenDetails;
        }
        return null;
    }
}
