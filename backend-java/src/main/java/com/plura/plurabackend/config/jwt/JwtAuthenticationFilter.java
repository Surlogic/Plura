package com.plura.plurabackend.config.jwt;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.plura.plurabackend.user.model.User;
import com.plura.plurabackend.user.model.UserRole;
import com.plura.plurabackend.user.repository.UserRepository;
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

    public JwtAuthenticationFilter(
        UserRepository userRepository,
        @Value("${jwt.secret}") String jwtSecret,
        @Value("${jwt.issuer:plura}") String jwtIssuer
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
        boolean allowInvalidToken = isPublicAuthPath(request);
        try {
            // Verifica firma, expiración e issuer.
            DecodedJWT jwt = verifier.verify(token);
            String subject = jwt.getSubject();
            String tokenRole = jwt.getClaim("role").asString();
            User user = loadActiveUser(subject, response, allowInvalidToken);
            if (user == null) {
                if (allowInvalidToken) {
                    filterChain.doFilter(request, response);
                }
                return;
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

    private boolean isPublicAuthPath(HttpServletRequest request) {
        String path = request.getServletPath();
        if (path == null || path.isBlank()) {
            path = request.getRequestURI();
        }
        if (path == null || path.isBlank()) {
            return false;
        }
        return path.equals("/auth/login")
            || path.startsWith("/auth/login/")
            || path.equals("/auth/register")
            || path.startsWith("/auth/register/")
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
}
