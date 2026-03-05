package com.plura.plurabackend.auth.oauth.providers;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.plura.plurabackend.auth.oauth.OAuthUserInfo;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.GeneralSecurityException;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class GoogleTokenVerifier {

    private static final List<String> VALID_ISSUERS = List.of(
        "accounts.google.com",
        "https://accounts.google.com"
    );

    private static final String GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

    private final String googleClientId;
    private final GoogleIdTokenVerifier verifier;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public GoogleTokenVerifier(
        @Value("${oauth.google.client-id:}") String googleClientId,
        ObjectMapper objectMapper
    ) {
        this.googleClientId = googleClientId == null ? "" : googleClientId.trim();
        this.verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
            .setAudience(List.of(this.googleClientId))
            .setIssuers(VALID_ISSUERS)
            .build();
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    }

    public OAuthUserInfo verify(String token) {
        requireConfigured();

        if (token == null || token.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token OAuth inválido");
        }

        // Try id_token verification first
        try {
            GoogleIdToken verified = verifier.verify(token);
            if (verified != null) {
                return extractFromIdToken(verified);
            }
        } catch (GeneralSecurityException | IOException | IllegalArgumentException ex) {
            // Not a valid id_token, fall through to access_token verification
        }

        // Fall back to access_token verification via Google userinfo API
        return verifyAccessToken(token);
    }

    private OAuthUserInfo extractFromIdToken(GoogleIdToken verified) {
        GoogleIdToken.Payload payload = verified.getPayload();
        String email = normalize(payload.getEmail());
        String providerId = normalize(payload.getSubject());
        String name = normalize((String) payload.get("name"));
        String avatar = normalize((String) payload.get("picture"));
        Boolean emailVerified = payload.getEmailVerified();

        if (email == null || providerId == null || !Boolean.TRUE.equals(emailVerified)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token de Google sin datos válidos");
        }

        if (name == null) {
            name = fallbackName(email);
        }

        return new OAuthUserInfo(
            "google",
            providerId,
            email.toLowerCase(Locale.ROOT),
            name,
            avatar
        );
    }

    private OAuthUserInfo verifyAccessToken(String accessToken) {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(GOOGLE_USERINFO_URL))
            .header("Authorization", "Bearer " + accessToken)
            .timeout(Duration.ofSeconds(5))
            .GET()
            .build();

        HttpResponse<String> response;
        try {
            response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (IOException | InterruptedException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No se pudo verificar token de Google");
        }

        if (response.statusCode() != 200) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token de Google inválido o expirado");
        }

        JsonNode json;
        try {
            json = objectMapper.readTree(response.body());
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Respuesta inválida de Google");
        }

        String email = normalize(json.has("email") ? json.get("email").asText() : null);
        String providerId = normalize(json.has("sub") ? json.get("sub").asText() : null);
        String name = normalize(json.has("name") ? json.get("name").asText() : null);
        String avatar = normalize(json.has("picture") ? json.get("picture").asText() : null);
        boolean emailVerified = json.has("email_verified") && json.get("email_verified").asBoolean();

        if (email == null || providerId == null || !emailVerified) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token de Google sin datos válidos");
        }

        if (name == null) {
            name = fallbackName(email);
        }

        return new OAuthUserInfo(
            "google",
            providerId,
            email.toLowerCase(Locale.ROOT),
            name,
            avatar
        );
    }

    private void requireConfigured() {
        if (googleClientId.isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "OAuth Google no configurado (GOOGLE_CLIENT_ID)"
            );
        }
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    private String fallbackName(String email) {
        int atIndex = email.indexOf('@');
        if (atIndex <= 0) {
            return "Usuario";
        }
        return email.substring(0, atIndex);
    }
}
