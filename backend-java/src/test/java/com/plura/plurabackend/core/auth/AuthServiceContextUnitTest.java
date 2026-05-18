package com.plura.plurabackend.core.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.auth0.jwt.JWT;
import com.plura.plurabackend.core.auth.context.AuthContextDescriptor;
import com.plura.plurabackend.core.auth.context.AuthContextResolver;
import com.plura.plurabackend.core.auth.context.AuthContextType;
import com.plura.plurabackend.core.auth.dto.LoginRequest;
import com.plura.plurabackend.core.auth.dto.SelectContextRequest;
import com.plura.plurabackend.core.auth.dto.UnifiedLoginRequest;
import com.plura.plurabackend.core.auth.model.AuthSession;
import com.plura.plurabackend.core.auth.model.AuthSessionType;
import com.plura.plurabackend.core.auth.oauth.OAuthService;
import com.plura.plurabackend.core.auth.repository.RefreshTokenRepository;
import com.plura.plurabackend.core.category.repository.CategoryRepository;
import com.plura.plurabackend.core.professional.ProfessionalAccountProfileGateway;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.model.UserRole;
import com.plura.plurabackend.core.user.repository.UserRepository;
import com.plura.plurabackend.professional.plan.EffectiveProfessionalPlanService;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class AuthServiceContextUnitTest {

    @Mock private UserRepository userRepository;
    @Mock private CategoryRepository categoryRepository;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private OAuthService oAuthService;
    @Mock private SessionService sessionService;
    @Mock private AuthAuditService authAuditService;
    @Mock private ProfessionalAccountProfileGateway professionalAccountProfileGateway;
    @Mock private EffectiveProfessionalPlanService effectiveProfessionalPlanService;
    @Mock private AuthContextResolver authContextResolver;
    @Mock private RegistrationPhoneVerificationService registrationPhoneVerificationService;

    private PasswordEncoder passwordEncoder;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder();
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
            registrationPhoneVerificationService,
            "unit-test-jwt-secret",
            30,
            30,
            "unit-test-refresh-pepper",
            "plura",
            true
        );
    }

    @Test
    void unifiedLoginForPureUserReturnsOnlyClientWithoutSelector() {
        User user = user(10L, UserRole.USER);
        AuthContextDescriptor client = clientContext();
        stubLoginUser(user);
        stubSession(user);
        when(authContextResolver.resolve(user)).thenReturn(List.of(client));
        when(authContextResolver.pickDefault(List.of(client))).thenReturn(client);

        AuthService.UnifiedLoginResult result = authService.loginUnified(
            unifiedRequest(null),
            sessionContext()
        );

        assertFalse(result.contextSelectionRequired());
        assertEquals(AuthContextType.CLIENT, result.activeContext().type());
        assertEquals(1, result.contexts().size());
        assertEquals("CLIENT", JWT.decode(result.auth().accessToken()).getClaim("ctx").asString());
    }

    @Test
    void userCannotSelectProfessionalAndDoesNotBootstrapProfile() {
        User user = user(11L, UserRole.USER);
        AuthContextDescriptor client = clientContext();
        stubLoginUser(user);
        when(authContextResolver.resolve(user)).thenReturn(List.of(client));
        when(authContextResolver.select(List.of(client), AuthContextType.PROFESSIONAL, null, null)).thenReturn(null);

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> authService.loginUnified(unifiedRequest(AuthContextType.PROFESSIONAL), sessionContext())
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        verify(professionalAccountProfileGateway, never()).loadOrBootstrapProfile(any());
    }

    @Test
    void professionalUnifiedLoginExposesClientAndProfessionalWithSelector() {
        User user = user(20L, UserRole.PROFESSIONAL);
        AuthContextDescriptor client = clientContext();
        AuthContextDescriptor professional = professionalContext("44");
        List<AuthContextDescriptor> contexts = List.of(client, professional);
        stubLoginUser(user);
        stubSession(user);
        when(authContextResolver.resolve(user)).thenReturn(contexts);
        when(authContextResolver.pickDefault(contexts)).thenReturn(professional);

        AuthService.UnifiedLoginResult result = authService.loginUnified(
            unifiedRequest(null),
            sessionContext()
        );

        assertTrue(result.contextSelectionRequired());
        assertEquals(2, result.contexts().size());
        assertEquals(AuthContextType.PROFESSIONAL, result.activeContext().type());
    }

    @Test
    void legacyClientLoginForProfessionalIssuesClientContext() {
        User user = user(21L, UserRole.PROFESSIONAL);
        AuthContextDescriptor client = clientContext();
        List<AuthContextDescriptor> contexts = List.of(client, professionalContext("45"));
        stubLoginUser(user);
        stubSession(user);
        when(authContextResolver.resolve(user)).thenReturn(contexts);
        when(authContextResolver.select(contexts, AuthContextType.CLIENT, null, null)).thenReturn(client);

        AuthService.AuthResult result = authService.loginCliente(loginRequest(), sessionContext());

        assertEquals("CLIENT", JWT.decode(result.accessToken()).getClaim("ctx").asString());
    }

    @Test
    void contextSelectProfessionalForUserDoesNotBootstrapProfile() {
        User user = user(12L, UserRole.USER);
        AuthContextDescriptor client = clientContext();
        when(userRepository.findByIdAndDeletedAtIsNull(12L)).thenReturn(Optional.of(user));
        when(authContextResolver.resolve(user)).thenReturn(List.of(client));
        when(authContextResolver.select(List.of(client), AuthContextType.PROFESSIONAL, null, null)).thenReturn(null);

        SelectContextRequest request = new SelectContextRequest();
        request.setType(AuthContextType.PROFESSIONAL);

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> authService.selectContext("12", "session-ctx", request)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        verify(professionalAccountProfileGateway, never()).loadOrBootstrapProfile(any());
    }

    private void stubLoginUser(User user) {
        when(userRepository.findByEmailAndDeletedAtIsNull("unit@plura.com")).thenReturn(Optional.of(user));
    }

    private void stubSession(User user) {
        when(userRepository.save(user)).thenReturn(user);
        when(sessionService.createSession(
            any(User.class),
            any(AuthSessionType.class),
            anyString(),
            any(),
            anyString(),
            anyString(),
            any()
        )).thenAnswer(invocation -> {
            AuthSession session = new AuthSession();
            session.setId("session-" + user.getId());
            session.setUser(user);
            session.setSessionType(invocation.getArgument(1, AuthSessionType.class));
            return session;
        });
    }

    private UnifiedLoginRequest unifiedRequest(AuthContextType desiredContext) {
        UnifiedLoginRequest request = new UnifiedLoginRequest();
        request.setEmail("unit@plura.com");
        request.setPassword("password-123");
        request.setDesiredContext(desiredContext);
        return request;
    }

    private LoginRequest loginRequest() {
        LoginRequest request = new LoginRequest();
        request.setEmail("unit@plura.com");
        request.setPassword("password-123");
        return request;
    }

    private AuthService.SessionContext sessionContext() {
        return new AuthService.SessionContext(AuthSessionType.WEB, "JUnit", "127.0.0.1");
    }

    private User user(Long id, UserRole role) {
        User user = new User();
        user.setId(id);
        user.setEmail("unit@plura.com");
        user.setFullName("Unit User");
        user.setPassword(passwordEncoder.encode("password-123"));
        user.setRole(role);
        user.setSessionVersion(1);
        return user;
    }

    private AuthContextDescriptor clientContext() {
        return new AuthContextDescriptor(AuthContextType.CLIENT, null, null, null, null, null, false);
    }

    private AuthContextDescriptor professionalContext(String professionalId) {
        return new AuthContextDescriptor(
            AuthContextType.PROFESSIONAL,
            professionalId,
            "Unit Pro",
            "unit-pro",
            null,
            null,
            true
        );
    }
}
