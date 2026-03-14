package com.plura.plurabackend.core.booking.ops;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class InternalOpsAccessService {

    private final String internalToken;

    public InternalOpsAccessService(
        @Value("${app.ops.internal-token:}") String internalToken
    ) {
        this.internalToken = internalToken == null ? "" : internalToken.trim();
    }

    public void requireAuthorized(String providedToken) {
        if (internalToken.isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Operación interna no habilitada"
            );
        }
        if (providedToken == null || providedToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Falta X-Internal-Token");
        }
        if (!MessageDigest.isEqual(
            internalToken.getBytes(StandardCharsets.UTF_8),
            providedToken.trim().getBytes(StandardCharsets.UTF_8)
        )) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Token interno inválido");
        }
    }
}
