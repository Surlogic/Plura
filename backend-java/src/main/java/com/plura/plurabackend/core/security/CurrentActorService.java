package com.plura.plurabackend.core.security;

import com.plura.plurabackend.core.auth.context.AuthContextType;
import com.plura.plurabackend.core.security.jwt.AuthenticatedTokenDetails;
import com.plura.plurabackend.core.user.model.UserRole;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CurrentActorService {

    public Authentication requireAuthentication() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sin sesión activa");
        }
        return authentication;
    }

    public Long currentUserId() {
        Authentication authentication = requireAuthentication();
        try {
            return Long.parseLong(authentication.getPrincipal().toString());
        } catch (NumberFormatException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token inválido");
        }
    }

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

    public AuthContextType currentContextType() {
        AuthenticatedTokenDetails details = currentTokenDetails();
        if (details != null && details.contextType() != null) {
            return details.contextType();
        }
        UserRole role = currentRole();
        return role == UserRole.PROFESSIONAL ? AuthContextType.PROFESSIONAL : AuthContextType.CLIENT;
    }

    public Long currentProfessionalUserId() {
        AuthContextType ctx = currentContextType();
        if (ctx != AuthContextType.PROFESSIONAL) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo profesionales");
        }
        if (currentRole() != UserRole.PROFESSIONAL) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo profesionales");
        }
        return currentUserId();
    }

    public Long currentClientUserId() {
        AuthContextType ctx = currentContextType();
        if (ctx != AuthContextType.CLIENT) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo clientes");
        }
        if (currentRole() != UserRole.USER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo clientes");
        }
        return currentUserId();
    }

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

    public AuthenticatedTokenDetails currentTokenDetails() {
        Authentication authentication = requireAuthentication();
        Object details = authentication.getDetails();
        if (details instanceof AuthenticatedTokenDetails authenticatedTokenDetails) {
            return authenticatedTokenDetails;
        }
        return null;
    }
}
