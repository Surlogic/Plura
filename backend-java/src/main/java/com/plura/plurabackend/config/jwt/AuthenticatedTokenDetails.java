package com.plura.plurabackend.config.jwt;

public record AuthenticatedTokenDetails(
    String sessionId,
    Integer sessionVersion,
    boolean legacyToken
) {}
