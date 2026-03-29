package com.plura.plurabackend.core.auth;

import com.plura.plurabackend.core.account.AccountDeletionService;
import com.plura.plurabackend.core.auth.dto.AcceptedMessageResponse;
import com.plura.plurabackend.core.auth.dto.AuthAuditListResponse;
import com.plura.plurabackend.core.auth.dto.ChangePasswordRequest;
import com.plura.plurabackend.core.auth.dto.CompleteOAuthPhoneRequest;
import com.plura.plurabackend.core.auth.dto.ConfirmEmailVerificationRequest;
import com.plura.plurabackend.core.auth.dto.ConfirmPhoneVerificationRequest;
import com.plura.plurabackend.core.auth.dto.DeleteAccountRequest;
import com.plura.plurabackend.core.auth.dto.EmailVerificationSendResponse;
import com.plura.plurabackend.core.auth.dto.LoginRequest;
import com.plura.plurabackend.core.auth.dto.LogoutRequest;
import com.plura.plurabackend.core.auth.dto.AuthSessionListResponse;
import com.plura.plurabackend.core.auth.dto.ForgotPasswordRequest;
import com.plura.plurabackend.core.auth.dto.PasswordRecoveryConfirmRequest;
import com.plura.plurabackend.core.auth.dto.PasswordResetCompletedResponse;
import com.plura.plurabackend.core.auth.dto.PasswordRecoveryStartRequest;
import com.plura.plurabackend.core.auth.dto.PasswordRecoveryVerifyPhoneRequest;
import com.plura.plurabackend.core.auth.dto.PasswordRecoveryVerifyPhoneResponse;
import com.plura.plurabackend.core.auth.dto.PhoneVerificationSendResponse;
import com.plura.plurabackend.core.auth.dto.ProfesionalProfileResponse;
import com.plura.plurabackend.core.auth.dto.OtpChallengeSendRequest;
import com.plura.plurabackend.core.auth.dto.OtpChallengeSendResponse;
import com.plura.plurabackend.core.auth.dto.OtpChallengeVerifyRequest;
import com.plura.plurabackend.core.auth.dto.OtpChallengeVerifyResponse;
import com.plura.plurabackend.core.auth.dto.RefreshSessionRequest;
import com.plura.plurabackend.core.auth.dto.RegistrationAcceptedResponse;
import com.plura.plurabackend.core.auth.dto.RegisterProfesionalRequest;
import com.plura.plurabackend.core.auth.dto.RegisterRequest;
import com.plura.plurabackend.core.auth.dto.RegisterResponse;
import com.plura.plurabackend.core.auth.dto.ResetPasswordRequest;
import com.plura.plurabackend.core.auth.dto.SendEmailVerificationRequest;
import com.plura.plurabackend.core.auth.dto.SendPhoneVerificationRequest;
import com.plura.plurabackend.core.auth.dto.UserResponse;
import com.plura.plurabackend.core.auth.model.AuthAuditEventType;
import com.plura.plurabackend.core.auth.model.AuthAuditStatus;
import com.plura.plurabackend.core.auth.model.AuthSessionType;
import com.plura.plurabackend.core.auth.model.OtpChallengePurpose;
import com.plura.plurabackend.core.auth.security.AuthAbuseProtectionService;
import com.plura.plurabackend.core.auth.oauth.dto.OAuthLoginRequest;
import com.plura.plurabackend.core.security.CurrentActorService;
import com.plura.plurabackend.core.security.jwt.AuthenticatedTokenDetails;
import com.plura.plurabackend.core.user.model.UserRole;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.Duration;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Controlador REST principal de autenticación y autorización.
 * Maneja todos los endpoints bajo /auth:
 * - Registro de clientes y profesionales
 * - Login (email/password y OAuth)
 * - Refresh de tokens y logout
 * - Verificación de email y teléfono
 * - Desafíos OTP (one-time password)
 * - Cambio y recuperación de contraseña
 * - Gestión de sesiones activas
 * - Eliminación de cuenta
 * - Consulta de log de auditoría
 *
 * Los tokens se envían como cookies HttpOnly por defecto (más seguro),
 * pero el cliente puede solicitar que se envíen en el body usando
 * el header X-Plura-Session-Transport: BODY (para apps móviles).
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    /** Nombre de la cookie que almacena el token de acceso JWT */
    private static final String ACCESS_COOKIE = "plura_access_token";
    /** Nombre de la cookie que almacena el refresh token */
    private static final String REFRESH_COOKIE = "plura_refresh_token";
    /** Header para indicar la plataforma del cliente (WEB o MOBILE) */
    private static final String CLIENT_PLATFORM_HEADER = "X-Plura-Client-Platform";
    /** Header para indicar si los tokens se envían por cookie o en el body de la respuesta */
    private static final String SESSION_TRANSPORT_HEADER = "X-Plura-Session-Transport";

    private final AuthService authService;
    private final PasswordLifecycleService passwordLifecycleService;
    private final EmailVerificationService emailVerificationService;
    private final PhoneVerificationService phoneVerificationService;
    private final OtpChallengeService otpChallengeService;
    private final AuthAuditService authAuditService;
    private final AccountDeletionService accountDeletionService;
    private final AuthAbuseProtectionService authAbuseProtectionService;
    private final CurrentActorService currentActorService;

    @Value("${jwt.refresh-days:30}")
    private long refreshTokenDays;

    @Value("${jwt.expiration-minutes:30}")
    private long accessTokenMinutes;

    @Value("${app.auth.cookie-secure:true}")
    private boolean cookieSecure;

    @Value("${app.auth.cookie-same-site:Strict}")
    private String cookieSameSite;

    @Value("${app.auth.expose-access-token:false}")
    private boolean exposeAccessToken;

    // Constructor injection to keep the controller immutable and testable.
    public AuthController(
        AuthService authService,
        PasswordLifecycleService passwordLifecycleService,
        EmailVerificationService emailVerificationService,
        PhoneVerificationService phoneVerificationService,
        OtpChallengeService otpChallengeService,
        AuthAuditService authAuditService,
        AccountDeletionService accountDeletionService,
        AuthAbuseProtectionService authAbuseProtectionService,
        CurrentActorService currentActorService
    ) {
        this.authService = authService;
        this.passwordLifecycleService = passwordLifecycleService;
        this.emailVerificationService = emailVerificationService;
        this.phoneVerificationService = phoneVerificationService;
        this.otpChallengeService = otpChallengeService;
        this.authAuditService = authAuditService;
        this.accountDeletionService = accountDeletionService;
        this.authAbuseProtectionService = authAbuseProtectionService;
        this.currentActorService = currentActorService;
    }

    /**
     * Registra un nuevo cliente.
     * Siempre retorna 202 Accepted para no revelar si el email ya existe (seguridad).
     * Aplica protección contra abuso (rate limiting) antes de procesar.
     */
    @PostMapping("/register/cliente")
    public ResponseEntity<RegistrationAcceptedResponse> registerCliente(
        @Valid @RequestBody RegisterRequest request,
        HttpServletRequest httpRequest
    ) {
        enforceRegistrationWithAudit(request.getEmail(), httpRequest);
        authService.registerCliente(request);
        return ResponseEntity.accepted()
            .header(HttpHeaders.CACHE_CONTROL, "no-store")
            .body(new RegistrationAcceptedResponse(
                "Si el email no estaba registrado, la cuenta fue creada. Si ya existía, podés iniciar sesión."
            ));
    }

    /**
     * Registra un nuevo profesional con datos adicionales (categoría, ubicación, etc.).
     * Misma lógica de seguridad que registerCliente: retorna 202 sin revelar existencia.
     */
    @PostMapping("/register/profesional")
    public ResponseEntity<RegistrationAcceptedResponse> registerProfesional(
        @Valid @RequestBody RegisterProfesionalRequest request,
        HttpServletRequest httpRequest
    ) {
        enforceRegistrationWithAudit(request.getEmail(), httpRequest);
        authService.registerProfesional(request);
        return ResponseEntity.accepted()
            .header(HttpHeaders.CACHE_CONTROL, "no-store")
            .body(new RegistrationAcceptedResponse(
                "Si el email no estaba registrado, la cuenta fue creada. Si ya existía, podés iniciar sesión."
            ));
    }

    /**
     * Login de clientes con email y contraseña.
     * Aplica rate limiting, registra auditoría de intentos fallidos,
     * y devuelve tokens de acceso + refresh en cookies o body.
     */
    @PostMapping("/login/cliente")
    public ResponseEntity<RegisterResponse> loginCliente(
        @Valid @RequestBody LoginRequest request,
        HttpServletRequest httpRequest
    ) {
        return authenticateLogin(
            request,
            httpRequest,
            () -> authService.loginCliente(request, buildSessionContext(httpRequest))
        );
    }

    @PostMapping("/login/profesional")
    public ResponseEntity<RegisterResponse> loginProfesional(
        @Valid @RequestBody LoginRequest request,
        HttpServletRequest httpRequest
    ) {
        return authenticateLogin(
            request,
            httpRequest,
            () -> authService.loginProfesional(request, buildSessionContext(httpRequest))
        );
    }

    @PostMapping("/oauth")
    public ResponseEntity<RegisterResponse> loginWithOAuth(
        @Valid @RequestBody OAuthLoginRequest request,
        HttpServletRequest httpRequest
    ) {
        AuthService.AuthResult result = authService.loginWithOAuth(
            request,
            buildSessionContext(httpRequest)
        );
        return buildAuthResponse(result, httpRequest);
    }

    @PostMapping("/oauth/complete-phone")
    public ResponseEntity<AcceptedMessageResponse> completeOAuthPhone(
        @Valid @RequestBody CompleteOAuthPhoneRequest request,
        Authentication authentication
    ) {
        Authentication activeAuthentication = requireAuthentication();
        authService.completeOAuthPhone(activeAuthentication.getPrincipal().toString(), request);
        return ResponseEntity.ok()
            .header(HttpHeaders.CACHE_CONTROL, "no-store")
            .body(new AcceptedMessageResponse("Teléfono guardado correctamente."));
    }

    @PostMapping("/refresh")
    public ResponseEntity<RegisterResponse> refreshSession(
        @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken,
        @RequestBody(required = false) RefreshSessionRequest request,
        Authentication authentication,
        HttpServletRequest httpRequest
    ) {
        String resolvedRefreshToken = resolveRefreshToken(refreshToken, request);
        String refreshOwnerId = authService.resolveRefreshOwnerId(resolvedRefreshToken);
        enforceAuthenticatedRateLimit(
            () -> authAbuseProtectionService.enforceRefreshAllowed(refreshOwnerId, httpRequest),
            AuthAuditEventType.REFRESH_RATE_LIMITED,
            authentication,
            httpRequest,
            refreshOwnerId == null ? null : Map.of("userId", refreshOwnerId)
        );
        AuthService.AuthResult result = authService.refreshSession(
            resolvedRefreshToken,
            buildSessionContext(httpRequest)
        );
        return buildAuthResponse(result, httpRequest);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
        @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken,
        @RequestBody(required = false) LogoutRequest request,
        Authentication authentication,
        HttpServletRequest httpRequest
    ) {
        authService.logout(
            resolveRefreshToken(refreshToken, request),
            resolveAuthenticatedUserId(authentication),
            resolveAuthenticatedSessionId(authentication)
        );
        authAuditService.log(
            AuthAuditEventType.LOGOUT,
            AuthAuditStatus.SUCCESS,
            authAuditService.parseUserId(resolveAuthenticatedUserId(authentication)),
            resolveAuthenticatedSessionId(authentication),
            extractClientIp(httpRequest),
            httpRequest == null ? null : httpRequest.getHeader("User-Agent"),
            null
        );
        return buildClearedSessionResponse();
    }

    @PostMapping("/logout-all")
    public ResponseEntity<Void> logoutAllSessions(Authentication authentication, HttpServletRequest httpRequest) {
        Authentication activeAuthentication = requireAuthentication();
        authService.logoutAllSessions(activeAuthentication.getPrincipal().toString());
        authAuditService.log(
            AuthAuditEventType.LOGOUT_ALL,
            AuthAuditStatus.SUCCESS,
            authAuditService.parseUserId(activeAuthentication.getPrincipal().toString()),
            resolveAuthenticatedSessionId(activeAuthentication),
            extractClientIp(httpRequest),
            httpRequest == null ? null : httpRequest.getHeader("User-Agent"),
            null
        );
        return buildClearedSessionResponse();
    }

    @PostMapping("/password/change")
    public ResponseEntity<Void> changePassword(
        @Valid @RequestBody ChangePasswordRequest request,
        Authentication authentication
    ) {
        Authentication activeAuthentication = requireAuthentication();
        passwordLifecycleService.changePassword(
            activeAuthentication.getPrincipal().toString(),
            request.getCurrentPassword(),
            request.getNewPassword()
        );
        return buildClearedSessionResponse();
    }

    @PostMapping("/password/forgot")
    public ResponseEntity<AcceptedMessageResponse> forgotPassword(
        @Valid @RequestBody ForgotPasswordRequest request,
        HttpServletRequest httpRequest
    ) {
        try {
            authAbuseProtectionService.enforcePasswordResetAllowed(request.getEmail(), httpRequest);
        } catch (ResponseStatusException rateLimited) {
            if (rateLimited.getStatusCode().value() == HttpStatus.TOO_MANY_REQUESTS.value()) {
                authAuditService.log(
                    AuthAuditEventType.FORGOT_PASSWORD_RATE_LIMITED,
                    AuthAuditStatus.FAILURE,
                    null,
                    null,
                    extractClientIp(httpRequest),
                    httpRequest == null ? null : httpRequest.getHeader("User-Agent"),
                    Map.of("email", request.getEmail() == null ? "" : request.getEmail().trim().toLowerCase(java.util.Locale.ROOT))
                );
            }
            throw rateLimited;
        }
        passwordLifecycleService.requestPasswordReset(
            request.getEmail(),
            extractClientIp(httpRequest),
            httpRequest == null ? null : httpRequest.getHeader("User-Agent")
        );
        return ResponseEntity.accepted()
            .header(HttpHeaders.CACHE_CONTROL, "no-store")
            .body(new AcceptedMessageResponse(
                "Si existe una cuenta recuperable para ese email, te enviamos instrucciones para restablecer la contraseña."
            ));
    }

    @PostMapping("/password/reset")
    public ResponseEntity<PasswordResetCompletedResponse> resetPassword(
        @Valid @RequestBody ResetPasswordRequest request
    ) {
        UserRole role = passwordLifecycleService.resetPassword(request.getToken(), request.getNewPassword());
        return buildClearedSessionResponse(new PasswordResetCompletedResponse(role.name()));
    }

    @PostMapping("/password/recovery/start")
    public ResponseEntity<AcceptedMessageResponse> startPasswordRecovery(
        @Valid @RequestBody PasswordRecoveryStartRequest request,
        HttpServletRequest httpRequest
    ) {
        passwordLifecycleService.startPasswordRecovery(
            request.getEmail(),
            extractClientIp(httpRequest),
            httpRequest == null ? null : httpRequest.getHeader("User-Agent")
        );
        return ResponseEntity.accepted()
            .header(HttpHeaders.CACHE_CONTROL, "no-store")
            .body(new AcceptedMessageResponse(
                "Email validado. Ahora confirmá el teléfono para enviarte el código de recuperación."
            ));
    }

    @PostMapping("/password/recovery/verify-phone")
    public ResponseEntity<PasswordRecoveryVerifyPhoneResponse> verifyPasswordRecoveryPhone(
        @Valid @RequestBody PasswordRecoveryVerifyPhoneRequest request,
        HttpServletRequest httpRequest
    ) {
        authAbuseProtectionService.enforcePasswordResetAllowed(request.getEmail(), httpRequest);
        PasswordRecoveryVerifyPhoneResponse response = passwordLifecycleService.verifyRecoveryPhoneAndSendCode(
            request.getEmail(),
            request.getPhoneNumber(),
            extractClientIp(httpRequest),
            httpRequest == null ? null : httpRequest.getHeader("User-Agent")
        );
        return ResponseEntity.ok()
            .header(HttpHeaders.CACHE_CONTROL, "no-store")
            .body(response);
    }

    @PostMapping("/password/recovery/confirm")
    public ResponseEntity<PasswordResetCompletedResponse> confirmPasswordRecovery(
        @Valid @RequestBody PasswordRecoveryConfirmRequest request,
        HttpServletRequest httpRequest
    ) {
        UserRole role = passwordLifecycleService.confirmPasswordRecovery(
            request.getEmail(),
            request.getPhoneNumber(),
            request.getChallengeId(),
            request.getCode(),
            request.getNewPassword(),
            request.getConfirmPassword(),
            extractClientIp(httpRequest),
            httpRequest == null ? null : httpRequest.getHeader("User-Agent")
        );
        return buildClearedSessionResponse(new PasswordResetCompletedResponse(role.name()));
    }

    @PostMapping("/verify/email/send")
    public ResponseEntity<EmailVerificationSendResponse> sendEmailVerification(
        @RequestBody(required = false) SendEmailVerificationRequest request,
        Authentication authentication,
        HttpServletRequest httpRequest
    ) {
        Authentication activeAuthentication = requireAuthentication();
        String userId = activeAuthentication.getPrincipal().toString();
        enforceAuthenticatedRateLimit(
            () -> authAbuseProtectionService.enforceEmailVerificationSendAllowed(userId, httpRequest),
            AuthAuditEventType.EMAIL_VERIFICATION_SEND_RATE_LIMITED,
            activeAuthentication,
            httpRequest,
            null
        );
        EmailVerificationSendResponse response = emailVerificationService.sendVerificationCode(
            userId,
            request == null ? null : request.getEmail()
        );
        return ResponseEntity.accepted()
            .header(HttpHeaders.CACHE_CONTROL, "no-store")
            .body(response);
    }

    @PostMapping("/verify/email/confirm")
    public ResponseEntity<Void> confirmEmailVerification(
        @RequestBody(required = false) ConfirmEmailVerificationRequest request,
        Authentication authentication,
        HttpServletRequest httpRequest
    ) {
        Authentication activeAuthentication = requireAuthentication();
        String userId = activeAuthentication.getPrincipal().toString();
        enforceAuthenticatedRateLimit(
            () -> authAbuseProtectionService.enforceEmailVerificationConfirmAllowed(userId, httpRequest),
            AuthAuditEventType.EMAIL_VERIFICATION_CONFIRM_RATE_LIMITED,
            activeAuthentication,
            httpRequest,
            null
        );
        emailVerificationService.confirmVerificationCode(
            userId,
            request == null ? null : request.getCode()
        );
        return ResponseEntity.noContent()
            .header(HttpHeaders.CACHE_CONTROL, "no-store")
            .build();
    }

    @PostMapping("/verify/phone/send")
    public ResponseEntity<PhoneVerificationSendResponse> sendPhoneVerification(
        @RequestBody(required = false) SendPhoneVerificationRequest request,
        Authentication authentication,
        HttpServletRequest httpRequest
    ) {
        Authentication activeAuthentication = requireAuthentication();
        String userId = activeAuthentication.getPrincipal().toString();
        enforceAuthenticatedRateLimit(
            () -> authAbuseProtectionService.enforcePhoneVerificationSendAllowed(userId, httpRequest),
            AuthAuditEventType.PHONE_VERIFICATION_SEND_RATE_LIMITED,
            activeAuthentication,
            httpRequest,
            null
        );
        PhoneVerificationSendResponse response = phoneVerificationService.sendVerificationCode(
            userId,
            request == null ? null : request.getPhoneNumber()
        );
        return ResponseEntity.accepted()
            .header(HttpHeaders.CACHE_CONTROL, "no-store")
            .body(response);
    }

    @PostMapping("/verify/phone/confirm")
    public ResponseEntity<Void> confirmPhoneVerification(
        @RequestBody(required = false) ConfirmPhoneVerificationRequest request,
        Authentication authentication,
        HttpServletRequest httpRequest
    ) {
        Authentication activeAuthentication = requireAuthentication();
        String userId = activeAuthentication.getPrincipal().toString();
        enforceAuthenticatedRateLimit(
            () -> authAbuseProtectionService.enforcePhoneVerificationConfirmAllowed(userId, httpRequest),
            AuthAuditEventType.PHONE_VERIFICATION_CONFIRM_RATE_LIMITED,
            activeAuthentication,
            httpRequest,
            null
        );
        phoneVerificationService.confirmVerificationCode(
            userId,
            request == null ? null : request.getCode()
        );
        return ResponseEntity.noContent()
            .header(HttpHeaders.CACHE_CONTROL, "no-store")
            .build();
    }

    @PostMapping("/challenge/send")
    public ResponseEntity<OtpChallengeSendResponse> sendOtpChallenge(
        @Valid @RequestBody OtpChallengeSendRequest request,
        Authentication authentication,
        HttpServletRequest httpRequest
    ) {
        Authentication activeAuthentication = requireAuthentication();
        String userId = activeAuthentication.getPrincipal().toString();
        enforceAuthenticatedRateLimit(
            () -> authAbuseProtectionService.enforceChallengeSendAllowed(userId, httpRequest),
            AuthAuditEventType.CHALLENGE_SEND_RATE_LIMITED,
            activeAuthentication,
            httpRequest,
            Map.of("purpose", request.getPurpose(), "channel", request.getChannel())
        );
        OtpChallengeSendResponse response = otpChallengeService.sendChallenge(
            userId,
            resolveAuthenticatedSessionId(activeAuthentication),
            request.getPurpose(),
            request.getChannel(),
            extractClientIp(httpRequest),
            httpRequest == null ? null : httpRequest.getHeader("User-Agent")
        );
        return ResponseEntity.ok()
            .header(HttpHeaders.CACHE_CONTROL, "no-store")
            .body(response);
    }

    @PostMapping("/challenge/verify")
    public ResponseEntity<OtpChallengeVerifyResponse> verifyOtpChallenge(
        @RequestBody(required = false) OtpChallengeVerifyRequest request,
        Authentication authentication,
        HttpServletRequest httpRequest
    ) {
        Authentication activeAuthentication = requireAuthentication();
        String userId = activeAuthentication.getPrincipal().toString();
        enforceAuthenticatedRateLimit(
            () -> authAbuseProtectionService.enforceChallengeVerifyAllowed(userId, httpRequest),
            AuthAuditEventType.CHALLENGE_VERIFY_RATE_LIMITED,
            activeAuthentication,
            httpRequest,
            request == null || request.getChallengeId() == null ? null : Map.of("challengeId", request.getChallengeId())
        );
        otpChallengeService.verifyChallenge(
            userId,
            resolveAuthenticatedSessionId(activeAuthentication),
            request == null ? null : request.getChallengeId(),
            request == null ? null : request.getCode(),
            null,
            extractClientIp(httpRequest),
            httpRequest == null ? null : httpRequest.getHeader("User-Agent")
        );
        return ResponseEntity.ok()
            .header(HttpHeaders.CACHE_CONTROL, "no-store")
            .body(new OtpChallengeVerifyResponse(true));
    }

    @GetMapping("/sessions")
    public AuthSessionListResponse listSessions(Authentication authentication) {
        Authentication activeAuthentication = requireAuthentication();
        return new AuthSessionListResponse(
            authService.listSessions(
                activeAuthentication.getPrincipal().toString(),
                resolveAuthenticatedSessionId(activeAuthentication)
            )
        );
    }

    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<Void> revokeSession(
        @PathVariable String sessionId,
        Authentication authentication
    ) {
        Authentication activeAuthentication = requireAuthentication();
        String currentSessionId = resolveAuthenticatedSessionId(activeAuthentication);
        authService.revokeSession(activeAuthentication.getPrincipal().toString(), sessionId);
        if (sessionId.equals(currentSessionId)) {
            return buildClearedSessionResponse();
        }
        return ResponseEntity.noContent()
            .header(HttpHeaders.CACHE_CONTROL, "no-store")
            .build();
    }

    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteCurrentAccount(
        @RequestBody(required = false) DeleteAccountRequest request,
        Authentication authentication,
        HttpServletRequest httpRequest
    ) {
        Authentication activeAuthentication = requireAuthentication();
        UserRole role = resolveAuthenticatedRole(activeAuthentication);
        if (request == null || request.getChallengeId() == null || request.getCode() == null) {
            throw new AuthApiException(
                HttpStatus.CONFLICT,
                "CHALLENGE_REQUIRED",
                "Necesitás verificar un challenge OTP para eliminar la cuenta."
            );
        }
        otpChallengeService.verifyChallengeOrAllowPreviouslyVerified(
            activeAuthentication.getPrincipal().toString(),
            resolveAuthenticatedSessionId(activeAuthentication),
            request.getChallengeId(),
            request.getCode(),
            OtpChallengePurpose.ACCOUNT_DELETION,
            extractClientIp(httpRequest),
            httpRequest == null ? null : httpRequest.getHeader("User-Agent")
        );
        Long userId = authAuditService.parseUserId(activeAuthentication.getPrincipal().toString());
        authAuditService.log(
            AuthAuditEventType.ACCOUNT_DELETION_REQUESTED,
            AuthAuditStatus.SUCCESS,
            userId,
            resolveAuthenticatedSessionId(activeAuthentication),
            extractClientIp(httpRequest),
            httpRequest == null ? null : httpRequest.getHeader("User-Agent"),
            Map.of("role", role.name())
        );
        try {
            accountDeletionService.deleteCurrentAccount(activeAuthentication.getPrincipal().toString(), role);
        } catch (RuntimeException exception) {
            authAuditService.log(
                AuthAuditEventType.ACCOUNT_DELETION_FAILED,
                AuthAuditStatus.FAILURE,
                userId,
                resolveAuthenticatedSessionId(activeAuthentication),
                extractClientIp(httpRequest),
                httpRequest == null ? null : httpRequest.getHeader("User-Agent"),
                Map.of("role", role.name(), "message", exception.getMessage() == null ? "unexpected_error" : exception.getMessage())
            );
            throw exception;
        }
        authAuditService.log(
            AuthAuditEventType.ACCOUNT_DELETION_COMPLETED,
            AuthAuditStatus.SUCCESS,
            userId,
            resolveAuthenticatedSessionId(activeAuthentication),
            extractClientIp(httpRequest),
            httpRequest == null ? null : httpRequest.getHeader("User-Agent"),
            Map.of("role", role.name())
        );
        return buildClearedSessionResponse();
    }

    @GetMapping("/audit")
    public AuthAuditListResponse getAuditLog() {
        Authentication activeAuthentication = requireAuthentication();
        Long userId = authAuditService.parseUserId(activeAuthentication.getPrincipal().toString());
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acceso denegado");
        }
        return authAuditService.getRecentEventsForUser(userId);
    }

    @GetMapping("/me/profesional")
    public ProfesionalProfileResponse getProfesionalProfile() {
        String profesionalId = String.valueOf(currentActorService.currentProfessionalUserId());
        return authService.getProfesionalProfile(profesionalId);
    }

    @GetMapping("/me/cliente")
    public UserResponse getClienteProfile() {
        String clienteId = String.valueOf(currentActorService.currentClientUserId());
        return authService.getClienteProfile(clienteId);
    }

    private ResponseEntity<RegisterResponse> buildAuthResponse(AuthService.AuthResult result, HttpServletRequest request) {
        ResponseCookie accessCookie = buildAccessCookie(result.accessToken());
        ResponseCookie refreshCookie = buildRefreshCookie(result.refreshToken());
        SessionTransport sessionTransport = resolveSessionTransport(request);
        boolean exposeTokensInBody = sessionTransport == SessionTransport.BODY;

        RegisterResponse payload = new RegisterResponse(
            exposeTokensInBody || exposeAccessToken ? result.accessToken() : null,
            exposeTokensInBody ? result.refreshToken() : null,
            result.user(),
            result.session()
        );

        return ResponseEntity.ok()
            .header(HttpHeaders.CACHE_CONTROL, "no-store, no-cache, max-age=0, must-revalidate")
            .header("Pragma", "no-cache")
            .header(HttpHeaders.SET_COOKIE, accessCookie.toString())
            .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
            .body(payload);
    }

    private ResponseCookie buildAccessCookie(String token) {
        return ResponseCookie.from(ACCESS_COOKIE, token)
            .httpOnly(true)
            .secure(cookieSecure)
            .sameSite(cookieSameSite)
            .path("/")
            .maxAge(Duration.ofMinutes(accessTokenMinutes))
            .build();
    }

    private ResponseCookie buildRefreshCookie(String token) {
        return ResponseCookie.from(REFRESH_COOKIE, token)
            .httpOnly(true)
            .secure(cookieSecure)
            .sameSite(cookieSameSite)
            .path("/auth")
            .maxAge(Duration.ofDays(refreshTokenDays))
            .build();
    }

    private ResponseCookie clearCookie(String name, String path) {
        return ResponseCookie.from(name, "")
            .httpOnly(true)
            .secure(cookieSecure)
            .sameSite(cookieSameSite)
            .path(path)
            .maxAge(0)
            .build();
    }

    private ResponseEntity<Void> buildClearedSessionResponse() {
        return ResponseEntity.noContent()
            .header(HttpHeaders.CACHE_CONTROL, "no-store")
            .header(HttpHeaders.SET_COOKIE, clearCookie(ACCESS_COOKIE, "/").toString())
            .header(HttpHeaders.SET_COOKIE, clearCookie(REFRESH_COOKIE, "/auth").toString())
            .build();
    }

    private <T> ResponseEntity<T> buildClearedSessionResponse(T body) {
        return ResponseEntity.ok()
            .header(HttpHeaders.CACHE_CONTROL, "no-store")
            .header(HttpHeaders.SET_COOKIE, clearCookie(ACCESS_COOKIE, "/").toString())
            .header(HttpHeaders.SET_COOKIE, clearCookie(REFRESH_COOKIE, "/auth").toString())
            .body(body);
    }

    private ResponseEntity<RegisterResponse> authenticateLogin(
        LoginRequest request,
        HttpServletRequest httpRequest,
        LoginExecutor loginExecutor
    ) {
        try {
            authAbuseProtectionService.enforceLoginAllowed(request.getEmail(), httpRequest);
        } catch (ResponseStatusException rateLimited) {
            if (rateLimited.getStatusCode().value() == HttpStatus.TOO_MANY_REQUESTS.value()) {
                authAuditService.log(
                    AuthAuditEventType.LOGIN_RATE_LIMITED,
                    AuthAuditStatus.FAILURE,
                    null,
                    null,
                    extractClientIp(httpRequest),
                    httpRequest == null ? null : httpRequest.getHeader("User-Agent"),
                    Map.of("email", request.getEmail() == null ? "" : request.getEmail().trim().toLowerCase(java.util.Locale.ROOT))
                );
            }
            throw rateLimited;
        }
        try {
            AuthService.AuthResult result = loginExecutor.login();
            authAbuseProtectionService.recordLoginSuccess(request.getEmail(), httpRequest);
            return buildAuthResponse(result, httpRequest);
        } catch (ResponseStatusException exception) {
            if (exception.getStatusCode().value() == HttpStatus.UNAUTHORIZED.value()) {
                authAbuseProtectionService.recordLoginFailure(request.getEmail(), httpRequest);
                authAuditService.log(
                    AuthAuditEventType.LOGIN_FAILURE,
                    AuthAuditStatus.FAILURE,
                    null,
                    null,
                    extractClientIp(httpRequest),
                    httpRequest == null ? null : httpRequest.getHeader("User-Agent"),
                    Map.of("email", request.getEmail() == null ? "" : request.getEmail().trim().toLowerCase(java.util.Locale.ROOT))
                );
            }
            throw exception;
        }
    }

    private AuthService.SessionContext buildSessionContext(HttpServletRequest request) {
        return new AuthService.SessionContext(
            resolveSessionType(request),
            request == null ? null : request.getHeader("User-Agent"),
            extractClientIp(request)
        );
    }

    private AuthSessionType resolveSessionType(HttpServletRequest request) {
        String rawPlatform = request == null ? null : request.getHeader(CLIENT_PLATFORM_HEADER);
        if (rawPlatform == null || rawPlatform.isBlank()) {
            return AuthSessionType.WEB;
        }
        String normalized = rawPlatform.trim().toUpperCase(java.util.Locale.ROOT);
        if ("MOBILE".equals(normalized)) {
            return AuthSessionType.MOBILE;
        }
        return AuthSessionType.WEB;
    }

    private SessionTransport resolveSessionTransport(HttpServletRequest request) {
        String rawTransport = request == null ? null : request.getHeader(SESSION_TRANSPORT_HEADER);
        if (rawTransport == null || rawTransport.isBlank()) {
            return SessionTransport.COOKIE;
        }
        String normalized = rawTransport.trim().toUpperCase(java.util.Locale.ROOT);
        if ("BODY".equals(normalized)) {
            return SessionTransport.BODY;
        }
        return SessionTransport.COOKIE;
    }

    private String resolveRefreshToken(String cookieRefreshToken, RefreshSessionRequest requestBody) {
        if (requestBody != null && requestBody.getRefreshToken() != null && !requestBody.getRefreshToken().isBlank()) {
            return requestBody.getRefreshToken().trim();
        }
        return cookieRefreshToken;
    }

    private String resolveRefreshToken(String cookieRefreshToken, LogoutRequest requestBody) {
        if (requestBody != null && requestBody.getRefreshToken() != null && !requestBody.getRefreshToken().isBlank()) {
            return requestBody.getRefreshToken().trim();
        }
        return cookieRefreshToken;
    }

    private String resolveAuthenticatedUserId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return null;
        }
        return authentication.getPrincipal().toString();
    }

    private String resolveAuthenticatedSessionId(Authentication authentication) {
        if (authentication == null) {
            return null;
        }
        Object details = authentication.getDetails();
        if (details instanceof AuthenticatedTokenDetails authenticatedTokenDetails) {
            return authenticatedTokenDetails.sessionId();
        }
        return null;
    }

    private String extractClientIp(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            int commaIndex = forwarded.indexOf(',');
            return commaIndex >= 0 ? forwarded.substring(0, commaIndex).trim() : forwarded.trim();
        }
        String remoteAddr = request.getRemoteAddr();
        return remoteAddr == null || remoteAddr.isBlank() ? null : remoteAddr.trim();
    }

    private Authentication requireAuthentication() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (
            authentication == null
                || !authentication.isAuthenticated()
                || authentication.getPrincipal() == null
                || authentication instanceof AnonymousAuthenticationToken
        ) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No autenticado");
        }
        return authentication;
    }

    private UserRole resolveAuthenticatedRole(Authentication authentication) {
        requireAuthentication();
        return currentActorService.currentRole();
    }

    private void enforceRegistrationWithAudit(String email, HttpServletRequest httpRequest) {
        try {
            authAbuseProtectionService.enforceRegistrationAllowed(email, httpRequest);
        } catch (ResponseStatusException rateLimited) {
            if (rateLimited.getStatusCode().value() == HttpStatus.TOO_MANY_REQUESTS.value()) {
                authAuditService.log(
                    AuthAuditEventType.REGISTER_RATE_LIMITED,
                    AuthAuditStatus.FAILURE,
                    null,
                    null,
                    extractClientIp(httpRequest),
                    httpRequest == null ? null : httpRequest.getHeader("User-Agent"),
                    Map.of("email", email == null ? "" : email.trim().toLowerCase(java.util.Locale.ROOT))
                );
            }
            throw rateLimited;
        }
    }

    private void enforceAuthenticatedRateLimit(
        AbuseCheck abuseCheck,
        AuthAuditEventType eventType,
        Authentication authentication,
        HttpServletRequest httpRequest,
        Map<String, ?> metadata
    ) {
        try {
            abuseCheck.run();
        } catch (ResponseStatusException rateLimited) {
            if (rateLimited.getStatusCode().value() == HttpStatus.TOO_MANY_REQUESTS.value()) {
                authAuditService.log(
                    eventType,
                    AuthAuditStatus.FAILURE,
                    authAuditService.parseUserId(resolveAuthenticatedUserId(authentication)),
                    resolveAuthenticatedSessionId(authentication),
                    extractClientIp(httpRequest),
                    httpRequest == null ? null : httpRequest.getHeader("User-Agent"),
                    metadata
                );
            }
            throw rateLimited;
        }
    }

    @FunctionalInterface
    private interface LoginExecutor {
        AuthService.AuthResult login();
    }

    @FunctionalInterface
    private interface AbuseCheck {
        void run();
    }

    private enum SessionTransport {
        COOKIE,
        BODY
    }
}
