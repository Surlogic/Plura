package com.plura.plurabackend.auth;

import com.plura.plurabackend.auth.dto.LoginRequest;
import com.plura.plurabackend.auth.dto.ProfesionalProfileResponse;
import com.plura.plurabackend.auth.dto.RegistrationAcceptedResponse;
import com.plura.plurabackend.auth.dto.RegisterProfesionalRequest;
import com.plura.plurabackend.auth.dto.RegisterRequest;
import com.plura.plurabackend.auth.dto.RegisterResponse;
import com.plura.plurabackend.auth.dto.UserResponse;
import com.plura.plurabackend.auth.security.AuthAbuseProtectionService;
import com.plura.plurabackend.auth.oauth.dto.OAuthLoginRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private static final String ACCESS_COOKIE = "plura_access_token";
    private static final String REFRESH_COOKIE = "plura_refresh_token";

    private final AuthService authService;
    private final AuthAbuseProtectionService authAbuseProtectionService;

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
        AuthAbuseProtectionService authAbuseProtectionService
    ) {
        this.authService = authService;
        this.authAbuseProtectionService = authAbuseProtectionService;
    }

    // Registro de clientes (alias /register).
    @PostMapping({"/register", "/register/cliente"})
    public ResponseEntity<RegistrationAcceptedResponse> registerCliente(
        @Valid @RequestBody RegisterRequest request,
        HttpServletRequest httpRequest
    ) {
        authAbuseProtectionService.enforceRegistrationAllowed(request.getEmail(), httpRequest);
        authService.registerCliente(request);
        return ResponseEntity.accepted()
            .header(HttpHeaders.CACHE_CONTROL, "no-store")
            .body(new RegistrationAcceptedResponse(
                "Si el email no estaba registrado, la cuenta fue creada. Si ya existía, podés iniciar sesión."
            ));
    }

    // Registro de profesionales con campos específicos.
    @PostMapping("/register/profesional")
    public ResponseEntity<RegistrationAcceptedResponse> registerProfesional(
        @Valid @RequestBody RegisterProfesionalRequest request,
        HttpServletRequest httpRequest
    ) {
        authAbuseProtectionService.enforceRegistrationAllowed(request.getEmail(), httpRequest);
        authService.registerProfesional(request);
        return ResponseEntity.accepted()
            .header(HttpHeaders.CACHE_CONTROL, "no-store")
            .body(new RegistrationAcceptedResponse(
                "Si el email no estaba registrado, la cuenta fue creada. Si ya existía, podés iniciar sesión."
            ));
    }

    @PostMapping({"/login", "/login/cliente"})
    public ResponseEntity<RegisterResponse> loginCliente(
        @Valid @RequestBody LoginRequest request,
        HttpServletRequest httpRequest
    ) {
        return authenticateLogin(
            request,
            httpRequest,
            () -> authService.loginCliente(request, httpRequest.getHeader("User-Agent"))
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
            () -> authService.loginProfesional(request, httpRequest.getHeader("User-Agent"))
        );
    }

    @PostMapping("/oauth")
    public ResponseEntity<RegisterResponse> loginWithOAuth(
        @Valid @RequestBody OAuthLoginRequest request,
        HttpServletRequest httpRequest
    ) {
        AuthService.AuthResult result = authService.loginWithOAuth(
            request,
            httpRequest.getHeader("User-Agent")
        );
        return buildAuthResponse(result);
    }

    @PostMapping("/refresh")
    public ResponseEntity<RegisterResponse> refreshSession(
        @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken,
        HttpServletRequest httpRequest
    ) {
        AuthService.AuthResult result = authService.refreshSession(refreshToken, httpRequest.getHeader("User-Agent"));
        return buildAuthResponse(result);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
        @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken
    ) {
        authService.logout(refreshToken);
        return ResponseEntity.noContent()
            .header(HttpHeaders.CACHE_CONTROL, "no-store")
            .header(HttpHeaders.SET_COOKIE, clearCookie(ACCESS_COOKIE, "/").toString())
            .header(HttpHeaders.SET_COOKIE, clearCookie(REFRESH_COOKIE, "/auth").toString())
            .build();
    }

    @GetMapping({"/me/profesional", "/me/professional"})
    public ProfesionalProfileResponse getProfesionalProfile() {
        Authentication authentication = requireAuthentication();
        requireRole(authentication, "ROLE_PROFESSIONAL");
        String profesionalId = authentication.getPrincipal().toString();
        return authService.getProfesionalProfile(profesionalId);
    }

    @GetMapping("/me/cliente")
    public UserResponse getClienteProfile() {
        Authentication authentication = requireAuthentication();
        requireRole(authentication, "ROLE_USER");
        String clienteId = authentication.getPrincipal().toString();
        return authService.getClienteProfile(clienteId);
    }

    private ResponseEntity<RegisterResponse> buildAuthResponse(AuthService.AuthResult result) {
        ResponseCookie accessCookie = buildAccessCookie(result.accessToken());
        ResponseCookie refreshCookie = buildRefreshCookie(result.refreshToken());

        RegisterResponse payload = new RegisterResponse(
            exposeAccessToken ? result.accessToken() : null,
            result.user()
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

    private ResponseEntity<RegisterResponse> authenticateLogin(
        LoginRequest request,
        HttpServletRequest httpRequest,
        LoginExecutor loginExecutor
    ) {
        authAbuseProtectionService.enforceLoginAllowed(request.getEmail(), httpRequest);
        try {
            AuthService.AuthResult result = loginExecutor.login();
            authAbuseProtectionService.recordLoginSuccess(request.getEmail(), httpRequest);
            return buildAuthResponse(result);
        } catch (ResponseStatusException exception) {
            if (exception.getStatusCode().value() == HttpStatus.UNAUTHORIZED.value()) {
                authAbuseProtectionService.recordLoginFailure(request.getEmail(), httpRequest);
            }
            throw exception;
        }
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

    private void requireRole(Authentication authentication, String role) {
        if (authentication.getAuthorities().stream().noneMatch(
            authority -> authority.equals(new SimpleGrantedAuthority(role))
        )) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acceso denegado");
        }
    }

    @FunctionalInterface
    private interface LoginExecutor {
        AuthService.AuthResult login();
    }
}
