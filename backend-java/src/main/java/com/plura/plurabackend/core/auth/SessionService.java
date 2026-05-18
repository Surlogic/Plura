package com.plura.plurabackend.core.auth;

import com.plura.plurabackend.core.auth.dto.AuthSessionResponse;
import com.plura.plurabackend.core.auth.context.AuthContextDescriptor;
import com.plura.plurabackend.core.auth.model.AuthSession;
import com.plura.plurabackend.core.auth.model.AuthSessionType;
import com.plura.plurabackend.core.auth.model.RefreshToken;
import com.plura.plurabackend.core.auth.repository.AuthSessionRepository;
import com.plura.plurabackend.core.auth.repository.RefreshTokenRepository;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * SessionService es un servicio de negocio del modulo autenticacion.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: authSessionRepository, refreshTokenRepository, userRepository.
 * Foco funcional: sesiones, servicios.
 */
@Service
public class SessionService {

    private static final String REVOKE_REASON_LOGOUT = "LOGOUT";
    private static final String REVOKE_REASON_LOGOUT_ALL = "LOGOUT_ALL";
    private static final String REVOKE_REASON_REFRESH_REUSE = "REFRESH_REUSE";
    private static final String REVOKE_REASON_ACCOUNT_DELETION = "ACCOUNT_DELETION";
    private static final String REVOKE_REASON_SESSION_REVOKED = "SESSION_REVOKED";
    private static final String REVOKE_REASON_SESSION_COMPROMISED = "SESSION_COMPROMISED";

    private final AuthSessionRepository authSessionRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;

    public SessionService(
        AuthSessionRepository authSessionRepository,
        RefreshTokenRepository refreshTokenRepository,
        UserRepository userRepository
    ) {
        this.authSessionRepository = authSessionRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.userRepository = userRepository;
    }

    /**
     * Crea sesion validando datos de entrada y persistiendo el resultado.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    @Transactional
    public AuthSession createSession(
        User user,
        AuthSessionType sessionType,
        String refreshTokenHash,
        String deviceLabel,
        String userAgent,
        String ipAddress,
        LocalDateTime expiresAt
    ) {
        AuthSession session = new AuthSession();
        session.setUser(user);
        session.setSessionType(sessionType == null ? AuthSessionType.WEB : sessionType);
        session.setRefreshTokenHash(refreshTokenHash);
        session.setDeviceLabel(normalizeDeviceLabel(deviceLabel, userAgent, sessionType));
        session.setUserAgent(normalizeUserAgent(userAgent));
        session.setIpAddress(normalizeIp(ipAddress));
        session.setExpiresAt(expiresAt);
        return authSessionRepository.save(session);
    }

    /**
     * Ejecuta la logica de rotate sesion manteniendola encapsulada en este componente.
     */
    @Transactional
    public AuthSession rotateSession(
        AuthSession session,
        String newRefreshTokenHash,
        String userAgent,
        String ipAddress,
        LocalDateTime expiresAt
    ) {
        session.setPreviousRefreshTokenHash(session.getRefreshTokenHash());
        session.setRefreshTokenHash(newRefreshTokenHash);
        session.setRefreshRotatedAt(LocalDateTime.now());
        session.setLastSeenAt(LocalDateTime.now());
        session.setUserAgent(normalizeUserAgent(userAgent));
        session.setIpAddress(normalizeIp(ipAddress));
        session.setExpiresAt(expiresAt);
        return authSessionRepository.save(session);
    }

    @Transactional
    public AuthSession updateActiveContext(AuthSession session, AuthContextDescriptor context) {
        if (session == null || context == null || context.type() == null) {
            return session;
        }
        session.setActiveContextType(context.type());
        session.setActiveProfessionalId(context.professionalId());
        session.setActiveWorkerId(context.workerId());
        return authSessionRepository.save(session);
    }

    /**
     * Ejecuta la logica de revoke sesion by refresh token manteniendola encapsulada en este componente.
     */
    @Transactional
    public void revokeSessionByRefreshToken(String refreshTokenHash, String reason) {
        authSessionRepository.findByRefreshTokenHash(refreshTokenHash)
            .ifPresent(session -> revokeSession(session, reason));
    }

    /**
     * Ejecuta la logica de revoke sesion manteniendola encapsulada en este componente.
     */
    @Transactional
    public void revokeSession(AuthSession session, String reason) {
        if (session.getRevokedAt() != null) {
            return;
        }
        session.setRevokedAt(LocalDateTime.now());
        session.setRevokeReason(normalizeReason(reason));
        authSessionRepository.save(session);
    }

    /**
     * Ejecuta la logica de revoke sesion by ID for usuario manteniendola encapsulada en este componente.
     */
    @Transactional
    public void revokeSessionByIdForUser(Long userId, String sessionId, String reason) {
        AuthSession session = authSessionRepository.findByIdAndUser_Id(sessionId, userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sesión no encontrada"));
        revokeSession(session, reason);
    }

    /**
     * Ejecuta la logica de revoke todos sesiones for usuario manteniendola encapsulada en este componente.
     */
    @Transactional
    public void revokeAllSessionsForUser(Long userId, String reason) {
        authSessionRepository.revokeActiveSessionsByUserId(userId, LocalDateTime.now(), normalizeReason(reason));
        refreshTokenRepository.revokeActiveTokensByUserId(userId, LocalDateTime.now());
    }

    /**
     * Ejecuta la logica de revoke todos sesiones for usuario manteniendola encapsulada en este componente.
     */
    @Transactional
    public void revokeAllSessionsForUser(User user, String reason) {
        if (user == null || user.getId() == null) {
            return;
        }
        revokeAllSessionsForUser(user.getId(), reason);
    }

    /**
     * Ejecuta la logica de invalidate todos sesiones for usuario manteniendola encapsulada en este componente.
     */
    @Transactional
    public void invalidateAllSessionsForUser(Long userId, String reason) {
        incrementSessionVersion(userId);
        revokeAllSessionsForUser(userId, reason);
    }

    /**
     * Busca sesion by ID aplicando filtros, joins o criterios del caso de uso.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
    public Optional<AuthSession> findSessionById(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return Optional.empty();
        }
        return authSessionRepository.findById(sessionId);
    }

    /**
     * Busca sesion by refresh token hash aplicando filtros, joins o criterios del caso de uso.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
    public Optional<AuthSession> findSessionByRefreshTokenHash(String refreshTokenHash) {
        if (refreshTokenHash == null || refreshTokenHash.isBlank()) {
            return Optional.empty();
        }
        return authSessionRepository.findByRefreshTokenHash(refreshTokenHash);
    }

    /**
     * Busca tracked refresh token match aplicando filtros, joins o criterios del caso de uso.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
    public Optional<TrackedRefreshTokenMatch> findTrackedRefreshTokenMatch(String refreshTokenHash) {
        if (refreshTokenHash == null || refreshTokenHash.isBlank()) {
            return Optional.empty();
        }
        return authSessionRepository.findByTrackedRefreshTokenHash(refreshTokenHash)
            .map(session -> new TrackedRefreshTokenMatch(
                session,
                refreshTokenHash.equals(session.getRefreshTokenHash())
                    ? RefreshTokenMatchType.CURRENT
                    : RefreshTokenMatchType.PREVIOUS
            ));
    }

    /**
     * Marca sesion compromised y actualiza los indicadores relacionados.
     */
    @Transactional
    public AuthSession markSessionCompromised(AuthSession session, String reason) {
        if (session.getCompromiseDetectedAt() == null) {
            session.setCompromiseDetectedAt(LocalDateTime.now());
        }
        if (session.getRevokedAt() == null) {
            session.setRevokedAt(LocalDateTime.now());
        }
        session.setRevokeReason(normalizeReason(reason));
        return authSessionRepository.save(session);
    }

    /**
     * Devuelve el listado de sesiones aplicando permisos y filtros del caso de uso.
     */
    public List<AuthSessionResponse> listSessions(Long userId, String currentSessionId) {
        return authSessionRepository.findByUser_IdOrderByCreatedAtDesc(userId).stream()
            .map(session -> toResponse(session, session.getId().equals(currentSessionId)))
            .toList();
    }

    /**
     * Ejecuta la logica de migrate legacy refresh token manteniendola encapsulada en este componente.
     */
    @Transactional
    public LegacyRefreshMigrationResult migrateLegacyRefreshToken(
        RefreshToken refreshToken,
        String newRefreshTokenHash,
        AuthSessionType sessionType,
        String userAgent,
        String ipAddress,
        LocalDateTime expiresAt
    ) {
        if (refreshToken.getRevokedAt() == null) {
            refreshToken.setRevokedAt(LocalDateTime.now());
            refreshTokenRepository.save(refreshToken);
        }
        AuthSession session = createSession(
            refreshToken.getUser(),
            sessionType,
            newRefreshTokenHash,
            null,
            userAgent,
            ipAddress,
            expiresAt
        );
        return new LegacyRefreshMigrationResult(session, refreshToken);
    }

    /**
     * Ejecuta la logica de increment sesion version manteniendola encapsulada en este componente.
     */
    @Transactional
    public void incrementSessionVersion(Long userId) {
        User user = userRepository.findByIdAndDeletedAtIsNull(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));
        int nextVersion = user.getSessionVersion() == null || user.getSessionVersion() < 1
            ? 1
            : user.getSessionVersion() + 1;
        user.setSessionVersion(nextVersion);
        userRepository.save(user);
    }

    /**
     * Ejecuta la logica de revoke reason logout manteniendola encapsulada en este componente.
     */
    public String revokeReasonLogout() {
        return REVOKE_REASON_LOGOUT;
    }

    /**
     * Ejecuta la logica de revoke reason logout todos manteniendola encapsulada en este componente.
     */
    public String revokeReasonLogoutAll() {
        return REVOKE_REASON_LOGOUT_ALL;
    }

    /**
     * Ejecuta la logica de revoke reason refresh reuse manteniendola encapsulada en este componente.
     */
    public String revokeReasonRefreshReuse() {
        return REVOKE_REASON_REFRESH_REUSE;
    }

    /**
     * Ejecuta la logica de revoke reason cuenta deletion manteniendola encapsulada en este componente.
     */
    public String revokeReasonAccountDeletion() {
        return REVOKE_REASON_ACCOUNT_DELETION;
    }

    /**
     * Ejecuta la logica de revoke reason sesion revoked manteniendola encapsulada en este componente.
     */
    public String revokeReasonSessionRevoked() {
        return REVOKE_REASON_SESSION_REVOKED;
    }

    /**
     * Ejecuta la logica de revoke reason sesion compromised manteniendola encapsulada en este componente.
     */
    public String revokeReasonSessionCompromised() {
        return REVOKE_REASON_SESSION_COMPROMISED;
    }

    /**
     * Convierte datos internos al formato respuesta esperado por el consumidor.
     */
    private AuthSessionResponse toResponse(AuthSession session, boolean current) {
        return new AuthSessionResponse(
            session.getId(),
            (session.getSessionType() == null ? AuthSessionType.WEB : session.getSessionType()).name(),
            session.getDeviceLabel(),
            session.getUserAgent(),
            session.getIpAddress(),
            session.getCreatedAt(),
            session.getLastSeenAt(),
            session.getExpiresAt(),
            session.getRevokedAt(),
            session.getRevokeReason(),
            current
        );
    }

    /**
     * Normaliza device label para evitar variantes vacias, invalidas o inconsistentes.
     */
    private String normalizeDeviceLabel(String explicitDeviceLabel, String userAgent, AuthSessionType sessionType) {
        String normalized = trimToNull(explicitDeviceLabel);
        if (normalized != null) {
            return normalized.length() <= 120 ? normalized : normalized.substring(0, 120);
        }
        String normalizedAgent = trimToNull(userAgent);
        if (normalizedAgent != null) {
            return normalizedAgent.length() <= 120 ? normalizedAgent : normalizedAgent.substring(0, 120);
        }
        return sessionType == AuthSessionType.MOBILE ? "Mobile" : "Web";
    }

    /**
     * Normaliza usuario agent para evitar variantes vacias, invalidas o inconsistentes.
     */
    private String normalizeUserAgent(String userAgent) {
        String normalized = trimToNull(userAgent);
        if (normalized == null) {
            return null;
        }
        return normalized.length() <= 500 ? normalized : normalized.substring(0, 500);
    }

    /**
     * Normaliza ip para evitar variantes vacias, invalidas o inconsistentes.
     */
    private String normalizeIp(String ipAddress) {
        String normalized = trimToNull(ipAddress);
        if (normalized == null) {
            return null;
        }
        return normalized.length() <= 64 ? normalized : normalized.substring(0, 64);
    }

    /**
     * Normaliza reason para evitar variantes vacias, invalidas o inconsistentes.
     */
    private String normalizeReason(String reason) {
        String normalized = trimToNull(reason);
        if (normalized == null) {
            return REVOKE_REASON_SESSION_REVOKED;
        }
        String upper = normalized.toUpperCase(Locale.ROOT);
        return upper.length() <= 40 ? upper : upper.substring(0, 40);
    }

    /**
     * Ejecuta la logica de trim to null manteniendola encapsulada en este componente.
     */
    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    /**
     * Bloque de datos legacy refresh migration result dentro de la respuesta principal.
     * Agrupa metricas relacionadas para que el frontend no tenga que reconstruirlas.
     */
    public record LegacyRefreshMigrationResult(
        AuthSession session,
        RefreshToken legacyToken
    ) {}

    /**
     * Bloque de datos tracked refresh token match dentro de la respuesta principal.
     * Agrupa metricas relacionadas para que el frontend no tenga que reconstruirlas.
     */
    public record TrackedRefreshTokenMatch(
        AuthSession session,
        RefreshTokenMatchType matchType
    ) {}

    public enum RefreshTokenMatchType {
        CURRENT,
        PREVIOUS
    }
}
