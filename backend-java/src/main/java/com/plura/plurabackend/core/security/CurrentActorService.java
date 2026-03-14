package com.plura.plurabackend.core.security;

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

    public Long currentProfessionalUserId() {
        if (currentRole() != UserRole.PROFESSIONAL) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo profesionales");
        }
        return currentUserId();
    }

    public Long currentClientUserId() {
        if (currentRole() != UserRole.USER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo clientes");
        }
        return currentUserId();
    }
}
