package com.plura.plurabackend.auth.oauth;

import com.plura.plurabackend.auth.oauth.dto.OAuthLoginRequest;
import com.plura.plurabackend.auth.oauth.providers.AppleTokenVerifier;
import com.plura.plurabackend.auth.oauth.providers.GoogleTokenVerifier;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class OAuthService {

    private final GoogleTokenVerifier googleTokenVerifier;
    private final AppleTokenVerifier appleTokenVerifier;
    private final boolean allowDirectGoogleToken;

    public OAuthService(
        GoogleTokenVerifier googleTokenVerifier,
        AppleTokenVerifier appleTokenVerifier,
        @Value("${app.auth.oauth.google.allow-direct-token:false}") boolean allowDirectGoogleToken
    ) {
        this.googleTokenVerifier = googleTokenVerifier;
        this.appleTokenVerifier = appleTokenVerifier;
        this.allowDirectGoogleToken = allowDirectGoogleToken;
    }

    public OAuthUserInfo verify(OAuthLoginRequest request) {
        String normalizedProvider = normalizeProvider(request.getProvider());
        String token = trimToNull(request.getToken());
        String authorizationCode = trimToNull(request.getAuthorizationCode());
        String codeVerifier = trimToNull(request.getCodeVerifier());
        String redirectUri = trimToNull(request.getRedirectUri());

        return switch (normalizedProvider) {
            case "google" -> {
                if (authorizationCode != null) {
                    yield googleTokenVerifier.verifyAuthorizationCode(
                        authorizationCode,
                        codeVerifier,
                        redirectUri
                    );
                }
                if (allowDirectGoogleToken && token != null) {
                    yield googleTokenVerifier.verify(token);
                }
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Google OAuth requiere authorizationCode, codeVerifier y redirectUri válidos"
                );
            }
            case "apple" -> appleTokenVerifier.verify(token);
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provider OAuth inválido");
        };
    }

    private String normalizeProvider(String provider) {
        if (provider == null) {
            return "";
        }
        return provider.trim().toLowerCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
