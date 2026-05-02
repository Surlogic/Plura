package com.plura.plurabackend.core.security.jwt;

import com.plura.plurabackend.core.auth.context.AuthContextType;

public record AuthenticatedTokenDetails(
    String sessionId,
    Integer sessionVersion,
    boolean legacyToken,
    AuthContextType contextType,
    String professionalId,
    String workerId
) {
    public AuthenticatedTokenDetails(String sessionId, Integer sessionVersion, boolean legacyToken) {
        this(sessionId, sessionVersion, legacyToken, null, null, null);
    }
}
