package com.plura.plurabackend.config.jwt;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
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

    private final JWTVerifier verifier;

    public JwtAuthenticationFilter(
        @Value("${jwt.secret}") String jwtSecret,
        @Value("${jwt.issuer:plura}") String jwtIssuer
    ) {
        // Construye el verificador con el secreto e issuer esperado.
        Algorithm algorithm = Algorithm.HMAC256(jwtSecret);
        this.verifier = JWT.require(algorithm)
            .withIssuer(jwtIssuer)
            .build();
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        String token = null;
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        }

        if (token == null || token.isBlank()) {
            if (request.getCookies() != null) {
                for (var cookie : request.getCookies()) {
                    if ("plura_access_token".equals(cookie.getName())) {
                        token = cookie.getValue();
                        break;
                    }
                }
            }
        }

        if (token == null || token.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }
        try {
            // Verifica firma, expiración e issuer.
            DecodedJWT jwt = verifier.verify(token);
            String subject = jwt.getSubject();
            String role = jwt.getClaim("role").asString();
            List<GrantedAuthority> authorities = new ArrayList<>();

            // Mapea el role del JWT a un rol de Spring Security.
            if ("PROFESSIONAL".equals(role)) {
                authorities.add(new SimpleGrantedAuthority("ROLE_PROFESSIONAL"));
            } else if ("USER".equals(role)) {
                authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
            }

            // Crea la autenticación con el subject del JWT.
            UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(subject, null, authorities);
            SecurityContextHolder.getContext().setAuthentication(authentication);
            filterChain.doFilter(request, response);
        } catch (JWTVerificationException ex) {
            // Limpia el contexto y responde 401 si el token es inválido/expirado.
            SecurityContextHolder.clearContext();
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Token inválido o expirado");
        }
    }
}
