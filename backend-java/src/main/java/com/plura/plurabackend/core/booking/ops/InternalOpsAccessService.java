package com.plura.plurabackend.core.booking.ops;

import com.plura.plurabackend.core.security.CurrentActorService;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class InternalOpsAccessService {

    private final String internalToken;
    private final String adminClientEmail;
    private final CurrentActorService currentActorService;
    private final UserRepository userRepository;

    public InternalOpsAccessService(
        @Value("${app.ops.internal-token:}") String internalToken,
        @Value("${app.ops.admin-client-email:admin@surlogicuy.com}") String adminClientEmail,
        CurrentActorService currentActorService,
        UserRepository userRepository
    ) {
        this.internalToken = internalToken == null ? "" : internalToken.trim();
        this.adminClientEmail = adminClientEmail == null ? "" : adminClientEmail.trim().toLowerCase();
        this.currentActorService = currentActorService;
        this.userRepository = userRepository;
    }

    public void requireAuthorized(String providedToken) {
        if (internalToken.isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Operacion interna no habilitada"
            );
        }
        if (providedToken == null || providedToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Falta X-Internal-Token");
        }
        if (!isValidInternalToken(providedToken)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Token interno invalido");
        }
    }

    public void requireAuthorizedOrAdminClientSession(String providedToken) {
        if (isValidInternalToken(providedToken) || isAuthorizedAdminClientSession()) {
            return;
        }

        if (providedToken != null && !providedToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Token interno invalido");
        }

        if (internalToken.isBlank() && adminClientEmail.isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Operacion interna no habilitada"
            );
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acceso interno restringido");
    }

    private boolean isValidInternalToken(String providedToken) {
        if (internalToken.isBlank() || providedToken == null || providedToken.isBlank()) {
            return false;
        }
        return MessageDigest.isEqual(
            internalToken.getBytes(StandardCharsets.UTF_8),
            providedToken.trim().getBytes(StandardCharsets.UTF_8)
        );
    }

    private boolean isAuthorizedAdminClientSession() {
        if (adminClientEmail.isBlank()) {
            return false;
        }
        try {
            Long userId = currentActorService.currentClientUserId();
            User user = userRepository.findByIdAndDeletedAtIsNull(userId).orElse(null);
            if (user == null || user.getEmail() == null) {
                return false;
            }
            return adminClientEmail.equals(user.getEmail().trim().toLowerCase());
        } catch (ResponseStatusException exception) {
            return false;
        }
    }
}
