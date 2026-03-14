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
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
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
    private static final String GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
    private static final String GOOGLE_TOKENINFO_URL = "https://www.googleapis.com/oauth2/v3/tokeninfo";

    private final String googleClientId;
    private final String googleClientSecret;
    private final Set<String> acceptedAudiences;
    private final Set<String> allowedRedirectUris;
    private final GoogleIdTokenVerifier verifier;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public GoogleTokenVerifier(
        @Value("${oauth.google.client-id:}") String googleClientId,
        @Value("${oauth.google.android-client-id:}") String googleAndroidClientId,
        @Value("${oauth.google.ios-client-id:}") String googleIosClientId,
        @Value("${oauth.google.client-secret:}") String googleClientSecret,
        @Value("${app.auth.oauth.google.allowed-redirect-uris:}") String allowedRedirectUris,
        ObjectMapper objectMapper
    ) {
        this.googleClientId = googleClientId == null ? "" : googleClientId.trim();
        this.googleClientSecret = googleClientSecret == null ? "" : googleClientSecret.trim();
        this.acceptedAudiences = parseAcceptedAudiences(
            this.googleClientId,
            googleAndroidClientId,
            googleIosClientId
        );
        this.allowedRedirectUris = parseAllowedRedirectUris(allowedRedirectUris);
        this.verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
            .setAudience(List.copyOf(this.acceptedAudiences.isEmpty() ? Set.of("__missing_google_client_id__") : this.acceptedAudiences))
            .setIssuers(VALID_ISSUERS)
            .build();
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    }

    public OAuthUserInfo verify(String token) {
        requireTokenVerificationConfigured();

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

    public OAuthUserInfo verifyAuthorizationCode(
        String authorizationCode,
        String codeVerifier,
        String redirectUri
    ) {
        requireAuthorizationCodeConfigured();
        if (authorizationCode == null || authorizationCode.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "authorizationCode OAuth faltante");
        }
        if (codeVerifier == null || codeVerifier.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "codeVerifier OAuth faltante");
        }
        if (redirectUri == null || redirectUri.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "redirectUri OAuth faltante");
        }
        validateRedirectUri(redirectUri);

        String exchangedToken = exchangeAuthorizationCode(authorizationCode, codeVerifier, redirectUri);
        return verify(exchangedToken);
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
        verifyAccessTokenMetadata(accessToken);

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

    private void verifyAccessTokenMetadata(String accessToken) {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(GOOGLE_TOKENINFO_URL + "?access_token=" + encodeForm(accessToken)))
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

        String aud = normalize(json.has("aud") ? json.get("aud").asText() : null);
        String issuedTo = normalize(json.has("issued_to") ? json.get("issued_to").asText() : null);
        String azp = normalize(json.has("azp") ? json.get("azp").asText() : null);
        if (!isAllowedAudience(aud, issuedTo, azp)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token de Google con audience inválida");
        }
    }

    private String exchangeAuthorizationCode(
        String authorizationCode,
        String codeVerifier,
        String redirectUri
    ) {
        String body = "grant_type=authorization_code"
            + "&code=" + encodeForm(authorizationCode)
            + "&code_verifier=" + encodeForm(codeVerifier)
            + "&client_id=" + encodeForm(googleClientId)
            + "&redirect_uri=" + encodeForm(redirectUri);
        if (!googleClientSecret.isBlank()) {
            body += "&client_secret=" + encodeForm(googleClientSecret);
        }

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(GOOGLE_TOKEN_URL))
            .header("Content-Type", "application/x-www-form-urlencoded")
            .header("Accept", "application/json")
            .timeout(Duration.ofSeconds(5))
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();

        HttpResponse<String> response;
        try {
            response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (IOException | InterruptedException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No se pudo canjear authorization code");
        }

        if (response.statusCode() != 200) {
            String googleError = extractGoogleErrorDescription(response.body());
            String message = "Authorization code de Google inválido";
            if (googleError != null) {
                message += ": " + googleError;
            }
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, message);
        }

        JsonNode json;
        try {
            json = objectMapper.readTree(response.body());
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Respuesta inválida de Google");
        }

        String idToken = normalize(json.has("id_token") ? json.get("id_token").asText() : null);
        if (idToken != null) return idToken;
        String accessToken = normalize(json.has("access_token") ? json.get("access_token").asText() : null);
        if (accessToken != null) return accessToken;

        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Google no devolvió token en el canje OAuth");
    }

    private String extractGoogleErrorDescription(String body) {
        if (body == null || body.isBlank()) return null;
        try {
            JsonNode json = objectMapper.readTree(body);
            String error = normalize(json.has("error") ? json.get("error").asText() : null);
            String description = normalize(json.has("error_description") ? json.get("error_description").asText() : null);
            if (error == null && description == null) {
                return null;
            }
            if (error != null && description != null) {
                return error + " - " + description;
            }
            return error != null ? error : description;
        } catch (IOException ex) {
            return null;
        }
    }

    private String encodeForm(String value) {
        try {
            return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parámetro OAuth inválido");
        }
    }

    private void requireTokenVerificationConfigured() {
        if (acceptedAudiences.isEmpty()) {
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "OAuth Google no configurado (GOOGLE_CLIENT_ID / GOOGLE_ANDROID_CLIENT_ID / GOOGLE_IOS_CLIENT_ID)"
            );
        }
    }

    private void requireAuthorizationCodeConfigured() {
        if (googleClientId.isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "OAuth Google no configurado (GOOGLE_CLIENT_ID)"
            );
        }
    }

    private void validateRedirectUri(String redirectUri) {
        if (allowedRedirectUris.isEmpty()) {
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "OAuth Google requiere app.auth.oauth.google.allowed-redirect-uris"
            );
        }
        String normalized = normalize(redirectUri);
        if (normalized == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "redirectUri OAuth inválido");
        }
        if (
            !(normalized.startsWith("https://")
                || normalized.startsWith("http://localhost")
                || normalized.startsWith("http://127.0.0.1"))
        ) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "redirectUri OAuth inválido");
        }
        if (!allowedRedirectUris.contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "redirectUri OAuth no permitido");
        }
    }

    private Set<String> parseAllowedRedirectUris(String rawAllowedRedirectUris) {
        if (rawAllowedRedirectUris == null || rawAllowedRedirectUris.isBlank()) {
            return Set.of();
        }
        Set<String> parsed = new HashSet<>();
        for (String value : rawAllowedRedirectUris.split(",")) {
            String normalized = normalize(value);
            if (normalized != null) {
                parsed.add(normalized);
            }
        }
        return Set.copyOf(parsed);
    }

    private Set<String> parseAcceptedAudiences(String... clientIds) {
        Set<String> parsed = new HashSet<>();
        for (String clientId : clientIds) {
            String normalized = normalize(clientId);
            if (normalized != null) {
                parsed.add(normalized);
            }
        }
        return Set.copyOf(parsed);
    }

    private boolean isAllowedAudience(String aud, String issuedTo, String azp) {
        return acceptedAudiences.contains(aud)
            || acceptedAudiences.contains(issuedTo)
            || acceptedAudiences.contains(azp);
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