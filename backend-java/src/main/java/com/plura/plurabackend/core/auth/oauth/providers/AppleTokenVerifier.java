package com.plura.plurabackend.core.auth.oauth.providers;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTDecodeException;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.auth.oauth.OAuthUserInfo;
import java.io.IOException;
import java.math.BigInteger;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.RSAPublicKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class AppleTokenVerifier {

    private static final String APPLE_ISSUER = "https://appleid.apple.com";
    private static final URI APPLE_JWKS_URI = URI.create("https://appleid.apple.com/auth/keys");
    private static final Duration KEY_CACHE_TTL = Duration.ofHours(6);

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String appleClientId;
    private volatile CachedKeys cachedKeys;

    public AppleTokenVerifier(
        @Value("${oauth.apple.client-id:}") String appleClientId,
        ObjectMapper objectMapper
    ) {
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();
        this.objectMapper = objectMapper;
        this.appleClientId = appleClientId == null ? "" : appleClientId.trim();
        this.cachedKeys = new CachedKeys(Map.of(), Instant.EPOCH);
    }

    public OAuthUserInfo verify(String idToken) {
        requireConfigured();

        if (idToken == null || idToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token OAuth inválido");
        }

        DecodedJWT decoded = decode(idToken);
        String keyId = normalize(decoded.getKeyId());
        if (keyId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token de Apple inválido");
        }

        RSAPublicKey publicKey = resolveKey(keyId);
        if (publicKey == null) {
            refreshKeys(true);
            publicKey = resolveKey(keyId);
        }
        if (publicKey == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No se pudo validar firma Apple");
        }

        DecodedJWT verified = verifySignatureAndClaims(idToken, publicKey);

        Instant expiresAt = verified.getExpiresAtAsInstant();
        if (expiresAt == null || expiresAt.isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token de Apple expirado");
        }

        String providerId = normalize(verified.getSubject());
        if (providerId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token de Apple sin subject");
        }

        String email = normalize(verified.getClaim("email").asString());
        String name = email != null ? fallbackName(email) : "Usuario";

        return new OAuthUserInfo(
            "apple",
            providerId,
            email == null ? null : email.toLowerCase(Locale.ROOT),
            name,
            null
        );
    }

    private DecodedJWT decode(String token) {
        try {
            return JWT.decode(token);
        } catch (JWTDecodeException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token de Apple inválido");
        }
    }

    private DecodedJWT verifySignatureAndClaims(String token, RSAPublicKey publicKey) {
        try {
            Algorithm algorithm = Algorithm.RSA256(publicKey, null);
            JWTVerifier verifier = JWT.require(algorithm)
                .withIssuer(APPLE_ISSUER)
                .withAudience(appleClientId)
                .build();
            return verifier.verify(token);
        } catch (JWTVerificationException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token de Apple inválido o expirado");
        }
    }

    private RSAPublicKey resolveKey(String keyId) {
        refreshKeys(false);
        return cachedKeys.byKid().get(keyId);
    }

    private synchronized void refreshKeys(boolean force) {
        CachedKeys current = this.cachedKeys;
        if (!force && !current.isExpired()) {
            return;
        }

        HttpRequest request = HttpRequest.newBuilder()
            .uri(APPLE_JWKS_URI)
            .GET()
            .timeout(Duration.ofSeconds(5))
            .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "No se pudo obtener claves públicas de Apple"
                );
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode keysNode = root.path("keys");
            if (!keysNode.isArray()) {
                throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Respuesta inválida de claves Apple"
                );
            }

            Map<String, RSAPublicKey> parsed = new HashMap<>();
            for (JsonNode keyNode : keysNode) {
                if (!"RSA".equalsIgnoreCase(keyNode.path("kty").asText())) {
                    continue;
                }
                String kid = normalize(keyNode.path("kid").asText(null));
                String modulus = normalize(keyNode.path("n").asText(null));
                String exponent = normalize(keyNode.path("e").asText(null));
                if (kid == null || modulus == null || exponent == null) {
                    continue;
                }
                parsed.put(kid, buildPublicKey(modulus, exponent));
            }

            if (parsed.isEmpty()) {
                throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "No se encontraron claves RSA de Apple"
                );
            }

            this.cachedKeys = new CachedKeys(Map.copyOf(parsed), Instant.now().plus(KEY_CACHE_TTL));
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "No se pudo consultar claves públicas de Apple"
            );
        } catch (IOException ex) {
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "No se pudo consultar claves públicas de Apple"
            );
        } catch (GeneralSecurityException | IllegalArgumentException ex) {
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "No se pudieron procesar claves públicas de Apple"
            );
        }
    }

    private RSAPublicKey buildPublicKey(String modulus, String exponent) throws GeneralSecurityException {
        byte[] modulusBytes = Base64.getUrlDecoder().decode(modulus);
        byte[] exponentBytes = Base64.getUrlDecoder().decode(exponent);
        BigInteger modulusInt = new BigInteger(1, modulusBytes);
        BigInteger exponentInt = new BigInteger(1, exponentBytes);
        RSAPublicKeySpec spec = new RSAPublicKeySpec(modulusInt, exponentInt);
        return (RSAPublicKey) KeyFactory.getInstance("RSA").generatePublic(spec);
    }

    private void requireConfigured() {
        if (appleClientId.isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "OAuth Apple no configurado (APPLE_CLIENT_ID)"
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

    private record CachedKeys(Map<String, RSAPublicKey> byKid, Instant expiresAt) {
        boolean isExpired() {
            return Instant.now().isAfter(expiresAt);
        }
    }
}
