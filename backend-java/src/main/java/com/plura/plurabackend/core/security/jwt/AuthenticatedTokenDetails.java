package com.plura.plurabackend.core.security.jwt;

public record AuthenticatedTokenDetails(
    String sessionId,
    Integer sessionVersion,
    boolean legacyToken
) {}
