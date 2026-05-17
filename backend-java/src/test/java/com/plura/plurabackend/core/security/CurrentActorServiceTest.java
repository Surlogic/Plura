package com.plura.plurabackend.core.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.core.auth.context.AuthContextType;
import com.plura.plurabackend.core.professional.ProfessionalAccountProfileGateway;
import com.plura.plurabackend.core.security.jwt.AuthenticatedTokenDetails;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class CurrentActorServiceTest {

    @Mock
    private ProfessionalAccountProfileGateway professionalAccountProfileGateway;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void professionalRoleWithClientContextCanActAsClient() {
        CurrentActorService service = new CurrentActorService(professionalAccountProfileGateway);
        authenticate(
            "42",
            "ROLE_PROFESSIONAL",
            new AuthenticatedTokenDetails("session", 1, false, AuthContextType.CLIENT, null, null)
        );

        assertEquals(42L, service.currentClientUserId());
    }

    @Test
    void professionalContextWithActiveProfileCanActAsProfessional() {
        CurrentActorService service = new CurrentActorService(professionalAccountProfileGateway);
        authenticate(
            "42",
            "ROLE_USER",
            new AuthenticatedTokenDetails("session", 1, false, AuthContextType.PROFESSIONAL, "9", null)
        );
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(9L);
        profile.setActive(true);
        when(professionalAccountProfileGateway.findByUserId(42L)).thenReturn(Optional.of(profile));

        assertEquals(42L, service.currentProfessionalUserId());
    }

    @Test
    void professionalContextWithoutActiveProfileFails() {
        CurrentActorService service = new CurrentActorService(professionalAccountProfileGateway);
        authenticate(
            "42",
            "ROLE_USER",
            new AuthenticatedTokenDetails("session", 1, false, AuthContextType.PROFESSIONAL, "9", null)
        );
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(9L);
        profile.setActive(false);
        when(professionalAccountProfileGateway.findByUserId(42L)).thenReturn(Optional.of(profile));

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            service::currentProfessionalUserId
        );

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
    }

    private void authenticate(String principal, String authority, AuthenticatedTokenDetails details) {
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
            principal,
            null,
            List.of(new SimpleGrantedAuthority(authority))
        );
        authentication.setDetails(details);
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
