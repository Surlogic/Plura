package com.plura.plurabackend.config.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URI;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class CookieOriginProtectionFilter extends OncePerRequestFilter {

    private static final String ACCESS_COOKIE = "plura_access_token";
    private static final String REFRESH_COOKIE = "plura_refresh_token";
    private static final Set<String> SAFE_METHODS = Set.of(
        HttpMethod.GET.name(),
        HttpMethod.HEAD.name(),
        HttpMethod.OPTIONS.name(),
        HttpMethod.TRACE.name()
    );

    private final Set<String> allowedOrigins;
    private final boolean trustForwardedHeaders;

    public CookieOriginProtectionFilter(
        @Value("${app.cors.allowed-origins:http://localhost:3002}") String rawAllowedOrigins,
        @Value("${app.security.trust-forwarded-headers:false}") boolean trustForwardedHeaders
    ) {
        this.allowedOrigins = Arrays.stream(rawAllowedOrigins.split(","))
            .map(String::trim)
            .filter(value -> !value.isBlank())
            .map(this::normalizeOrigin)
            .filter(value -> value != null)
            .collect(Collectors.toUnmodifiableSet());
        this.trustForwardedHeaders = trustForwardedHeaders;
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        if (shouldSkip(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        String requestOrigin = resolveRequestOrigin(request);
        String callerOrigin = resolveCallerOrigin(request);
        if (requestOrigin == null || callerOrigin == null) {
            response.sendError(HttpStatus.FORBIDDEN.value(), "CSRF protection: origin requerido");
            return;
        }

        if (requestOrigin.equals(callerOrigin) || allowedOrigins.contains(callerOrigin)) {
            filterChain.doFilter(request, response);
            return;
        }

        response.sendError(HttpStatus.FORBIDDEN.value(), "CSRF protection: origin inválido");
    }

    private boolean shouldSkip(HttpServletRequest request) {
        if (SAFE_METHODS.contains(request.getMethod())) {
            return true;
        }
        String path = request.getRequestURI();
        if (isPublicAuthEndpoint(path)) {
            return true;
        }
        if (path != null && path.startsWith("/webhooks/")) {
            return true;
        }
        String authorization = request.getHeader("Authorization");
        if (authorization != null && authorization.trim().regionMatches(true, 0, "Bearer ", 0, 7)) {
            return true;
        }
        return !hasAuthCookie(request);
    }

    private boolean isPublicAuthEndpoint(String path) {
        if (path == null || path.isBlank()) {
            return false;
        }
        return path.startsWith("/auth/register")
            || path.startsWith("/auth/login")
            || path.equals("/auth/password/forgot")
            || path.equals("/auth/password/reset")
            || path.startsWith("/auth/oauth");
    }

    private boolean hasAuthCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null || cookies.length == 0) {
            return false;
        }
        for (Cookie cookie : cookies) {
            if (cookie == null) {
                continue;
            }
            String name = cookie.getName();
            if (!ACCESS_COOKIE.equals(name) && !REFRESH_COOKIE.equals(name)) {
                continue;
            }
            String value = cookie.getValue();
            if (value != null && !value.isBlank()) {
                return true;
            }
        }
        return false;
    }

    private String resolveCallerOrigin(HttpServletRequest request) {
        String originHeader = request.getHeader("Origin");
        String normalizedOrigin = normalizeOrigin(originHeader);
        if (normalizedOrigin != null) {
            return normalizedOrigin;
        }
        String refererHeader = request.getHeader("Referer");
        return normalizeOrigin(refererHeader);
    }

    private String resolveRequestOrigin(HttpServletRequest request) {
        String scheme = request.getScheme();
        String host = request.getServerName();
        int port = request.getServerPort();

        if (trustForwardedHeaders) {
            String forwardedProto = firstForwardedValue(request.getHeader("X-Forwarded-Proto"));
            String forwardedHost = firstForwardedValue(request.getHeader("X-Forwarded-Host"));
            if (forwardedProto != null && !forwardedProto.isBlank()) {
                scheme = forwardedProto.trim();
            }
            if (forwardedHost != null && !forwardedHost.isBlank()) {
                String trimmed = forwardedHost.trim();
                int colon = trimmed.lastIndexOf(':');
                if (colon > 0 && colon < trimmed.length() - 1) {
                    host = trimmed.substring(0, colon);
                    try {
                        port = Integer.parseInt(trimmed.substring(colon + 1));
                    } catch (NumberFormatException ignored) {
                        // Keep current port.
                    }
                } else {
                    host = trimmed;
                }
            }
        }

        if (scheme == null || host == null || host.isBlank()) {
            return null;
        }
        return normalizeOrigin(scheme + "://" + host + ":" + port);
    }

    private String normalizeOrigin(String rawValue) {
        if (rawValue == null) {
            return null;
        }
        String value = rawValue.trim();
        if (value.isBlank()) {
            return null;
        }
        try {
            URI uri = URI.create(value);
            String scheme = uri.getScheme();
            String host = uri.getHost();
            if (scheme == null || host == null) {
                return null;
            }
            String normalizedScheme = scheme.toLowerCase(Locale.ROOT);
            if (!"http".equals(normalizedScheme) && !"https".equals(normalizedScheme)) {
                return null;
            }
            int port = uri.getPort();
            if (port < 0) {
                port = "https".equals(normalizedScheme) ? 443 : 80;
            }
            return normalizedScheme + "://" + host.toLowerCase(Locale.ROOT) + ":" + port;
        } catch (RuntimeException exception) {
            return null;
        }
    }

    private String firstForwardedValue(String rawHeader) {
        if (rawHeader == null || rawHeader.isBlank()) {
            return null;
        }
        int comma = rawHeader.indexOf(',');
        return comma >= 0 ? rawHeader.substring(0, comma) : rawHeader;
    }
}
