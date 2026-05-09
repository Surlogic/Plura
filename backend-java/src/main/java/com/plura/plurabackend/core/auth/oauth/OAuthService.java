package com.plura.plurabackend.core.auth.oauth;

import com.plura.plurabackend.core.auth.oauth.dto.OAuthLoginRequest;
import com.plura.plurabackend.core.auth.oauth.providers.AppleTokenVerifier;
import com.plura.plurabackend.core.auth.oauth.providers.GoogleTokenVerifier;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Servicio central de autenticacion OAuth que coordina la verificacion
 * de tokens segun el proveedor (Google o Apple).
 *
 * <p>Actua como fachada para los verificadores especificos de cada proveedor,
 * normalizando la entrada y delegando la verificacion al componente apropiado.
 * Soporta tanto el flujo de authorization code (PKCE) como tokens directos
 * para Google, y tokens de identidad para Apple.</p>
 */
@Service
public class OAuthService {

    private final GoogleTokenVerifier googleTokenVerifier;
    private final AppleTokenVerifier appleTokenVerifier;
    /** Indica si se permite verificar tokens directos de Google (id_token/access_token) sin pasar por el flujo de authorization code */
    private final boolean allowDirectGoogleToken;

    /**
     * Constructor que inyecta los verificadores de cada proveedor y la configuracion.
     *
     * @param googleTokenVerifier verificador de tokens de Google
     * @param appleTokenVerifier  verificador de tokens de Apple
     * @param allowDirectGoogleToken si es true, permite verificar tokens directos de Google ademas del flujo de authorization code
     */
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
                // Prioridad 1: flujo de authorization code (PKCE) - el metodo preferido
                if (authorizationCode != null) {
                    yield googleTokenVerifier.verifyAuthorizationCode(
                        authorizationCode,
                        codeVerifier,
                        redirectUri
                    );
                }
                // Prioridad 2: token directo (id_token o access_token) - solo si esta habilitado
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

    /**
     * Normaliza proveedor para evitar variantes vacias, invalidas o inconsistentes.
     */
    private String normalizeProvider(String provider) {
        if (provider == null) {
            return "";
        }
        return provider.trim().toLowerCase(Locale.ROOT);
    }

    /**
     * Ejecuta la logica de trim to null manteniendola encapsulada en este componente.
     */
    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
