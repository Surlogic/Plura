package com.plura.plurabackend.core.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.core.auth.model.AuthSession;
import com.plura.plurabackend.core.auth.model.AuthSessionType;
import com.plura.plurabackend.core.auth.model.RefreshToken;
import com.plura.plurabackend.core.auth.oauth.OAuthService;
import com.plura.plurabackend.core.category.repository.CategoryRepository;
import com.plura.plurabackend.core.professional.ProfessionalAccountProfileGateway;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.model.UserRole;
import com.plura.plurabackend.core.user.repository.UserRepository;
import com.plura.plurabackend.professional.plan.EffectiveProfessionalPlanService;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.plura.plurabackend.core.auth.repository.RefreshTokenRepository;

@ExtendWith(MockitoExtension.class)
class AuthServiceRefreshUnitTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private OAuthService oAuthService;

    @Mock
    private SessionService sessionService;

    @Mock
    private AuthAuditService authAuditService;

    @Mock
    private ProfessionalAccountProfileGateway professionalAccountProfileGateway;

    @Mock
    private EffectiveProfessionalPlanService effectiveProfessionalPlanService;

    @Mock
    private com.plura.plurabackend.core.auth.context.AuthContextResolver authContextResolver;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
        authService = new AuthService(
            userRepository,
            categoryRepository,
            refreshTokenRepository,
            oAuthService,
            sessionService,
            authAuditService,
            professionalAccountProfileGateway,
            effectiveProfessionalPlanService,
            authContextResolver,
            passwordEncoder,
            "unit-test-jwt-secret",
            30,
            30,
            "unit-test-refresh-pepper",
            "plura",
            true
        );
    }

    @Test
    void refreshTrackedSessionWithoutSessionTypeFallsBackToContextType() {
        User user = buildUser();
        AuthSession session = buildSession(user);
        session.setSessionType(null);

        when(sessionService.findTrackedRefreshTokenMatch(anyString()))
            .thenReturn(Optional.of(new SessionService.TrackedRefreshTokenMatch(session, SessionService.RefreshTokenMatchType.CURRENT)));
        when(sessionService.rotateSession(eq(session), anyString(), eq("JUnit"), eq("127.0.0.1"), any(LocalDateTime.class)))
            .thenAnswer(invocation -> {
                session.setRefreshTokenHash(invocation.getArgument(1, String.class));
                session.setUserAgent(invocation.getArgument(2, String.class));
                session.setIpAddress(invocation.getArgument(3, String.class));
                session.setExpiresAt(invocation.getArgument(4, LocalDateTime.class));
                return session;
            });

        AuthService.AuthResult result = authService.refreshSession(
            "tracked-refresh-token",
            new AuthService.SessionContext(AuthSessionType.WEB, "JUnit", "127.0.0.1")
        );

        assertEquals("WEB", result.session().getSessionType());
        assertEquals(AuthSessionType.WEB, session.getSessionType());
        assertFalse(result.refreshToken().isBlank());
    }

    @Test
    void refreshTrackedSessionWithoutExpiryReturnsUnauthorizedInsteadOf500() {
        User user = buildUser();
        AuthSession session = buildSession(user);
        session.setExpiresAt(null);

        when(sessionService.findTrackedRefreshTokenMatch(anyString()))
            .thenReturn(Optional.of(new SessionService.TrackedRefreshTokenMatch(session, SessionService.RefreshTokenMatchType.CURRENT)));

        AuthApiException exception = assertThrows(
            AuthApiException.class,
            () -> authService.refreshSession(
                "tracked-refresh-token",
                new AuthService.SessionContext(AuthSessionType.WEB, "JUnit", "127.0.0.1")
            )
        );

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatus());
        assertEquals("SESSION_INVALID", exception.getErrorCode());
        verify(sessionService).revokeSession(session, "SESSION_INVALID");
    }

    @Test
    void refreshLegacyTokenWithoutExpiryReturnsUnauthorizedInsteadOf500() {
        User user = buildUser();
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setToken("legacy-refresh-hash");
        refreshToken.setExpiryDate(null);

        when(sessionService.findTrackedRefreshTokenMatch(anyString())).thenReturn(Optional.empty());
        when(refreshTokenRepository.findByToken(anyString())).thenReturn(Optional.of(refreshToken));

        AuthApiException exception = assertThrows(
            AuthApiException.class,
            () -> authService.refreshSession(
                "legacy-refresh-token",
                new AuthService.SessionContext(AuthSessionType.MOBILE, "JUnit", "127.0.0.1")
            )
        );

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatus());
        assertEquals("SESSION_INVALID", exception.getErrorCode());
        verify(refreshTokenRepository).save(refreshToken);
    }

    private User buildUser() {
        User user = new User();
        user.setId(7L);
        user.setEmail("refresh-unit@plura.com");
        user.setRole(UserRole.USER);
        user.setSessionVersion(1);
        return user;
    }

    private AuthSession buildSession(User user) {
        AuthSession session = new AuthSession();
        session.setId("session-unit-test");
        session.setUser(user);
        session.setSessionType(AuthSessionType.WEB);
        session.setRefreshTokenHash("tracked-refresh-hash");
        session.setExpiresAt(LocalDateTime.now().plusDays(1));
        return session;
    }
}
