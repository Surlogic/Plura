package com.plura.plurabackend.core.security.jwt;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.plura.plurabackend.core.auth.AuthAuditService;
import com.plura.plurabackend.core.auth.model.AuthAuditEventType;
import com.plura.plurabackend.core.auth.model.AuthAuditStatus;
import com.plura.plurabackend.core.auth.SessionService;
import com.plura.plurabackend.core.auth.model.AuthSession;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.model.UserRole;
import com.plura.plurabackend.core.user.repository.UserRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String ACCESS_COOKIE = "plura_access_token";

    private final JWTVerifier verifier;
    private final UserRepository userRepository;
    private final SessionService sessionService;
    private final AuthAuditService authAuditService;
    private final boolean allowLegacyJwt;

    public JwtAuthenticationFilter(
        UserRepository userRepository,
        SessionService sessionService,
        AuthAuditService authAuditService,
        @Value("${jwt.secret}") String jwtSecret,
        @Value("${jwt.issuer:plura}") String jwtIssuer,
        @Value("${app.auth.allow-legacy-jwt:true}") boolean allowLegacyJwt
    ) {
        // jwtSecret es obligatorio; el puerto de render lo inyecta como JWT_SECRET.
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException("La propiedad jwt.secret no está definida. "
                + "Configure la variable de entorno JWT_SECRET antes de iniciar la aplicación.");
        }
        // Construye el verificador con el secreto e issuer esperado.
        Algorithm algorithm = Algorithm.HMAC256(jwtSecret);
        this.verifier = JWT.require(algorithm)
            .withIssuer(jwtIssuer)
            .build();
        this.userRepository = userRepository;
        this.sessionService = sessionService;
        this.authAuditService = authAuditService;
        this.allowLegacyJwt = allowLegacyJwt;
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        String token = null;
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null) {
            String trimmedHeader = authHeader.trim();
            if (trimmedHeader.regionMatches(true, 0, "Bearer ", 0, 7)) {
                token = trimmedHeader.substring(7).trim();
            }
        }

        if (token == null || token.isBlank()) {
            token = extractTokenFromCookie(request);
        }

        if (token == null || token.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }
        boolean allowInvalidToken = isPublicRoute(request);
        try {
            // Verifica firma, expiración e issuer.
            DecodedJWT jwt = verifier.verify(token);
            String subject = jwt.getSubject();
            String tokenRole = jwt.getClaim("role").asString();
            String sessionId = jwt.getClaim("sid").asString();
            Integer sessionVersion = jwt.getClaim("sv").asInt();
            User user = loadActiveUser(subject, response, allowInvalidToken);
            if (user == null) {
                if (allowInvalidToken) {
                    filterChain.doFilter(request, response);
                }
                return;
            }
            if (isLegacyToken(sessionId, sessionVersion)) {
                if (!allowLegacyJwt) {
                    rejectLegacyToken(user, request, response, allowInvalidToken);
                    if (allowInvalidToken) {
                        filterChain.doFilter(request, response);
                    }
                    return;
                }
            } else {
                AuthSession session = loadValidSession(sessionId, user, response, allowInvalidToken);
                if (session == null) {
                    if (allowInvalidToken) {
                        filterChain.doFilter(request, response);
                    }
                    return;
                }
                if (!isSessionVersionConsistent(sessionVersion, user.getSessionVersion())) {
                    if (allowInvalidToken) {
                        SecurityContextHolder.clearContext();
                        filterChain.doFilter(request, response);
                        return;
                    }
                    SecurityContextHolder.clearContext();
                    response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Sesion invalida");
                    return;
                }
            }
            if (!isRoleConsistent(tokenRole, user.getRole())) {
                if (allowInvalidToken) {
                    SecurityContextHolder.clearContext();
                    filterChain.doFilter(request, response);
                    return;
                }
                SecurityContextHolder.clearContext();
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Token inválido para el rol actual");
                return;
            }
            List<GrantedAuthority> authorities = new ArrayList<>();

            // Mapea el rol actual persistido a authorities de Spring Security.
            if (user.getRole() == UserRole.PROFESSIONAL) {
                authorities.add(new SimpleGrantedAuthority("ROLE_PROFESSIONAL"));
            } else if (user.getRole() == UserRole.USER) {
                authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
            } else {
                SecurityContextHolder.clearContext();
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Rol de token inválido");
                return;
            }

            // Crea la autenticación con el subject del JWT.
            UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(subject, null, authorities);
            authentication.setDetails(new AuthenticatedTokenDetails(sessionId, sessionVersion, isLegacyToken(sessionId, sessionVersion)));
            SecurityContextHolder.getContext().setAuthentication(authentication);
            filterChain.doFilter(request, response);
        } catch (JWTVerificationException ex) {
            if (allowInvalidToken) {
                SecurityContextHolder.clearContext();
                filterChain.doFilter(request, response);
                return;
            }
            // Limpia el contexto y responde 401 si el token es inválido/expirado.
            SecurityContextHolder.clearContext();
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Token inválido o expirado");
        }
    }

    private User loadActiveUser(
        String rawUserId,
        HttpServletResponse response,
        boolean allowInvalidToken
    ) throws IOException {
        Long userId;
        try {
            userId = Long.parseLong(rawUserId);
        } catch (NumberFormatException exception) {
            if (allowInvalidToken) {
                SecurityContextHolder.clearContext();
                return null;
            }
            SecurityContextHolder.clearContext();
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Token inválido");
            return null;
        }

        User user = userRepository.findByIdAndDeletedAtIsNull(userId).orElse(null);
        if (user == null) {
            if (allowInvalidToken) {
                SecurityContextHolder.clearContext();
                return null;
            }
            SecurityContextHolder.clearContext();
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Usuario no encontrado");
            return null;
        }
        return user;
    }

    private boolean isRoleConsistent(String tokenRole, UserRole persistedRole) {
        if (tokenRole == null || tokenRole.isBlank() || persistedRole == null) {
            return false;
        }
        return persistedRole.name().equals(tokenRole.trim());
    }

    private boolean isSessionVersionConsistent(Integer tokenSessionVersion, Integer persistedSessionVersion) {
        if (tokenSessionVersion == null || persistedSessionVersion == null) {
            return false;
        }
        return persistedSessionVersion.equals(tokenSessionVersion);
    }

    private boolean isLegacyToken(String sessionId, Integer sessionVersion) {
        return sessionId == null || sessionId.isBlank() || sessionVersion == null;
    }

    private void rejectLegacyToken(
        User user,
        HttpServletRequest request,
        HttpServletResponse response,
        boolean allowInvalidToken
    ) throws IOException {
        authAuditService.log(
            AuthAuditEventType.LEGACY_TOKEN_REJECTED,
            AuthAuditStatus.FAILURE,
            user == null ? null : user.getId(),
            null,
            extractClientIp(request),
            request == null ? null : request.getHeader("User-Agent"),
            java.util.Map.of("type", "legacy_jwt")
        );
        if (allowInvalidToken) {
            SecurityContextHolder.clearContext();
            return;
        }
        SecurityContextHolder.clearContext();
        response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Token legacy no admitido");
    }

    private AuthSession loadValidSession(
        String sessionId,
        User user,
        HttpServletResponse response,
        boolean allowInvalidToken
    ) throws IOException {
        AuthSession session = sessionService.findSessionById(sessionId).orElse(null);
        if (session == null || session.getUser() == null || !user.getId().equals(session.getUser().getId())) {
            if (allowInvalidToken) {
                SecurityContextHolder.clearContext();
                return null;
            }
            SecurityContextHolder.clearContext();
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Sesion no encontrada");
            return null;
        }
        if (session.getRevokedAt() != null) {
            if (allowInvalidToken) {
                SecurityContextHolder.clearContext();
                return null;
            }
            SecurityContextHolder.clearContext();
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Sesion revocada");
            return null;
        }
        if (session.getExpiresAt() != null && session.getExpiresAt().isBefore(java.time.LocalDateTime.now())) {
            if (allowInvalidToken) {
                SecurityContextHolder.clearContext();
                return null;
            }
            SecurityContextHolder.clearContext();
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Sesion expirada");
            return null;
        }
        return session;
    }

    private boolean isPublicRoute(HttpServletRequest request) {
        if (request != null && "OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String path = request.getServletPath();
        if (path == null || path.isBlank()) {
            path = request.getRequestURI();
        }
        if (path == null || path.isBlank()) {
            return false;
        }
        return path.equals("/health")
            || path.equals("/categories")
            || path.equals("/api/categories")
            || path.equals("/api/home")
            || path.equals("/error")
            || path.startsWith("/api/search")
            || path.startsWith("/api/geo/")
            || path.startsWith("/public/")
            || path.startsWith("/uploads/")
            || path.startsWith("/webhooks/")
            || ("GET".equalsIgnoreCase(request.getMethod())
                && path.equals("/profesional/payment-providers/mercadopago/oauth/callback"))
            || path.startsWith("/auth/login/")
            || path.startsWith("/auth/register/")
            || path.equals("/auth/password/forgot")
            || path.equals("/auth/password/reset")
            || path.equals("/auth/password/recovery/start")
            || path.equals("/auth/password/recovery/verify-phone")
            || path.equals("/auth/password/recovery/confirm")
            || path.equals("/auth/oauth")
            || path.equals("/auth/refresh")
            || path.equals("/auth/logout");
    }

    private String extractTokenFromCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null || cookies.length == 0) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (cookie == null) {
                continue;
            }
            if (ACCESS_COOKIE.equals(cookie.getName())) {
                String value = cookie.getValue();
                if (value == null || value.isBlank()) {
                    return null;
                }
                return value.trim();
            }
        }
        return null;
    }

    private String extractClientIp(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
