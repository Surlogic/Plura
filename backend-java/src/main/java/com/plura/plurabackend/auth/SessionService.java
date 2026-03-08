package com.plura.plurabackend.auth;

import com.plura.plurabackend.auth.dto.AuthSessionResponse;
import com.plura.plurabackend.auth.model.AuthSession;
import com.plura.plurabackend.auth.model.AuthSessionType;
import com.plura.plurabackend.auth.model.RefreshToken;
import com.plura.plurabackend.auth.repository.AuthSessionRepository;
import com.plura.plurabackend.auth.repository.RefreshTokenRepository;
import com.plura.plurabackend.user.model.User;
import com.plura.plurabackend.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

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
    public void revokeSessionByRefreshToken(String refreshTokenHash, String reason) {
        authSessionRepository.findByRefreshTokenHash(refreshTokenHash)
            .ifPresent(session -> revokeSession(session, reason));
    }

    @Transactional
    public void revokeSession(AuthSession session, String reason) {
        if (session.getRevokedAt() != null) {
            return;
        }
        session.setRevokedAt(LocalDateTime.now());
        session.setRevokeReason(normalizeReason(reason));
        authSessionRepository.save(session);
    }

    @Transactional
    public void revokeSessionByIdForUser(Long userId, String sessionId, String reason) {
        AuthSession session = authSessionRepository.findByIdAndUser_Id(sessionId, userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sesión no encontrada"));
        revokeSession(session, reason);
    }

    @Transactional
    public void revokeAllSessionsForUser(Long userId, String reason) {
        authSessionRepository.revokeActiveSessionsByUserId(userId, LocalDateTime.now(), normalizeReason(reason));
        refreshTokenRepository.revokeActiveTokensByUserId(userId, LocalDateTime.now());
    }

    @Transactional
    public void revokeAllSessionsForUser(User user, String reason) {
        if (user == null || user.getId() == null) {
            return;
        }
        revokeAllSessionsForUser(user.getId(), reason);
    }

    @Transactional
    public void invalidateAllSessionsForUser(Long userId, String reason) {
        incrementSessionVersion(userId);
        revokeAllSessionsForUser(userId, reason);
    }

    public Optional<AuthSession> findSessionById(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return Optional.empty();
        }
        return authSessionRepository.findById(sessionId);
    }

    public Optional<AuthSession> findSessionByRefreshTokenHash(String refreshTokenHash) {
        if (refreshTokenHash == null || refreshTokenHash.isBlank()) {
            return Optional.empty();
        }
        return authSessionRepository.findByRefreshTokenHash(refreshTokenHash);
    }

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

    public List<AuthSessionResponse> listSessions(Long userId, String currentSessionId) {
        return authSessionRepository.findByUser_IdOrderByCreatedAtDesc(userId).stream()
            .map(session -> toResponse(session, session.getId().equals(currentSessionId)))
            .toList();
    }

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

    public String revokeReasonLogout() {
        return REVOKE_REASON_LOGOUT;
    }

    public String revokeReasonLogoutAll() {
        return REVOKE_REASON_LOGOUT_ALL;
    }

    public String revokeReasonRefreshReuse() {
        return REVOKE_REASON_REFRESH_REUSE;
    }

    public String revokeReasonAccountDeletion() {
        return REVOKE_REASON_ACCOUNT_DELETION;
    }

    public String revokeReasonSessionRevoked() {
        return REVOKE_REASON_SESSION_REVOKED;
    }

    public String revokeReasonSessionCompromised() {
        return REVOKE_REASON_SESSION_COMPROMISED;
    }

    private AuthSessionResponse toResponse(AuthSession session, boolean current) {
        return new AuthSessionResponse(
            session.getId(),
            session.getSessionType().name(),
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

    private String normalizeUserAgent(String userAgent) {
        String normalized = trimToNull(userAgent);
        if (normalized == null) {
            return null;
        }
        return normalized.length() <= 500 ? normalized : normalized.substring(0, 500);
    }

    private String normalizeIp(String ipAddress) {
        String normalized = trimToNull(ipAddress);
        if (normalized == null) {
            return null;
        }
        return normalized.length() <= 64 ? normalized : normalized.substring(0, 64);
    }

    private String normalizeReason(String reason) {
        String normalized = trimToNull(reason);
        if (normalized == null) {
            return REVOKE_REASON_SESSION_REVOKED;
        }
        String upper = normalized.toUpperCase(Locale.ROOT);
        return upper.length() <= 40 ? upper : upper.substring(0, 40);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    public record LegacyRefreshMigrationResult(
        AuthSession session,
        RefreshToken legacyToken
    ) {}

    public record TrackedRefreshTokenMatch(
        AuthSession session,
        RefreshTokenMatchType matchType
    ) {}

    public enum RefreshTokenMatchType {
        CURRENT,
        PREVIOUS
    }
}
