package com.plura.plurabackend.auth.oauth;

import com.plura.plurabackend.auth.oauth.providers.AppleTokenVerifier;
import com.plura.plurabackend.auth.oauth.providers.GoogleTokenVerifier;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class OAuthService {

    private final GoogleTokenVerifier googleTokenVerifier;
    private final AppleTokenVerifier appleTokenVerifier;

    public OAuthService(
        GoogleTokenVerifier googleTokenVerifier,
        AppleTokenVerifier appleTokenVerifier
    ) {
        this.googleTokenVerifier = googleTokenVerifier;
        this.appleTokenVerifier = appleTokenVerifier;
    }

    public OAuthUserInfo verify(String provider, String token) {
        String normalizedProvider = normalizeProvider(provider);
        return switch (normalizedProvider) {
            case "google" -> googleTokenVerifier.verify(token);
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
}
