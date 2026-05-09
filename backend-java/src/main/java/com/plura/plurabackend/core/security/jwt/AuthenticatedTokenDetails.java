package com.plura.plurabackend.core.security.jwt;

import com.plura.plurabackend.core.auth.context.AuthContextType;

/**
 * AuthenticatedTokenDetails es un modelo inmutable del modulo seguridad.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: autenticacion y sesiones.
 */
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
