package com.plura.plurabackend.core.billing.providerconnection.mercadopago;

import com.plura.plurabackend.core.billing.BillingProperties;
import com.plura.plurabackend.core.billing.webhooks.signature.SignatureUtils;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * MercadoPagoOAuthStateService es un servicio de negocio del modulo billing / conexion de proveedor / Mercado Pago.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: billingProperties.
 * Foco funcional: Mercado Pago, servicios, OAuth, autenticacion y sesiones.
 */
@Service
public class MercadoPagoOAuthStateService {

    private static final long STATE_TTL_SECONDS = 900L;

    private final BillingProperties billingProperties;
    private final SecureRandom secureRandom = new SecureRandom();

    public MercadoPagoOAuthStateService(BillingProperties billingProperties) {
        this.billingProperties = billingProperties;
    }

    /**
     * Genera estado con formato estable para uso interno o externo.
     */
    public GeneratedState generateState(Long professionalId) {
        if (professionalId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "professionalId es obligatorio");
        }
        long issuedAt = Instant.now().getEpochSecond();
        String nonce = randomNonce();
        String payload = professionalId + ":" + issuedAt + ":" + nonce;
        String encodedPayload = Base64.getUrlEncoder().withoutPadding()
            .encodeToString(payload.getBytes(StandardCharsets.UTF_8));
        String signature = SignatureUtils.hmacSha256Hex(resolveSigningSecret(), encodedPayload);
        return new GeneratedState(
            encodedPayload + "." + signature,
            LocalDateTime.ofInstant(Instant.ofEpochSecond(issuedAt + STATE_TTL_SECONDS), ZoneOffset.UTC),
            buildPkceChallenge()
        );
    }

    /**
     * Valida estado y lanza un error controlado si no cumple el contrato.
     * Esta separacion hace explicita la regla de seguridad o negocio que protege el flujo.
     */
    public void validateState(String rawState, Long expectedProfessionalId) {
        ParsedState parsedState = parseAndValidateState(rawState);
        if (expectedProfessionalId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "professionalId esperado es obligatorio");
        }
        if (!expectedProfessionalId.equals(parsedState.professionalId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "state OAuth no pertenece al profesional autenticado");
        }
    }

    /**
     * Resuelve profesional ID normalizando entradas, defaults y casos borde.
     */
    public Long resolveProfessionalId(String rawState) {
        return parseAndValidateState(rawState).professionalId();
    }

    /**
     * Parsea and validate estado y convierte errores de formato en errores controlados.
     */
    private ParsedState parseAndValidateState(String rawState) {
        if (rawState == null || rawState.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "state OAuth es obligatorio");
        }
        int separatorIndex = rawState.lastIndexOf('.');
        if (separatorIndex <= 0 || separatorIndex >= rawState.length() - 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "state OAuth invalido");
        }
        String encodedPayload = rawState.substring(0, separatorIndex);
        String providedSignature = rawState.substring(separatorIndex + 1);
        String expectedSignature = SignatureUtils.hmacSha256Hex(resolveSigningSecret(), encodedPayload);
        if (!MessageDigest.isEqual(
            expectedSignature.getBytes(StandardCharsets.UTF_8),
            providedSignature.getBytes(StandardCharsets.UTF_8)
        )) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "state OAuth invalido");
        }
        String payload;
        try {
            payload = new String(
                Base64.getUrlDecoder().decode(encodedPayload),
                StandardCharsets.UTF_8
            );
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "state OAuth invalido");
        }
        String[] parts = payload.split(":", 3);
        if (parts.length != 3) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "state OAuth invalido");
        }
        Long professionalId;
        long issuedAtEpoch;
        try {
            professionalId = Long.valueOf(parts[0]);
            issuedAtEpoch = Long.parseLong(parts[1]);
        } catch (NumberFormatException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "state OAuth invalido");
        }
        long nowEpoch = Instant.now().getEpochSecond();
        if (issuedAtEpoch <= 0 || nowEpoch - issuedAtEpoch > STATE_TTL_SECONDS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "state OAuth expirado");
        }
        return new ParsedState(professionalId, issuedAtEpoch);
    }

    /**
     * Ejecuta la logica de random nonce manteniendola encapsulada en este componente.
     */
    private String randomNonce() {
        byte[] randomBytes = new byte[18];
        secureRandom.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    /**
     * Construye pkce challenge a partir de datos internos ya validados.
     */
    private PkceChallenge buildPkceChallenge() {
        if (!isPkceEnabled()) {
            return null;
        }
        byte[] randomBytes = new byte[64];
        secureRandom.nextBytes(randomBytes);
        String verifier = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
        try {
            byte[] challengeBytes = MessageDigest.getInstance("SHA-256")
                .digest(verifier.getBytes(StandardCharsets.US_ASCII));
            String challenge = Base64.getUrlEncoder().withoutPadding().encodeToString(challengeBytes);
            return new PkceChallenge(verifier, challenge, "S256");
        } catch (NoSuchAlgorithmException exception) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "No se pudo inicializar PKCE para Mercado Pago OAuth"
            );
        }
    }

    /**
     * Evalua is pkce enabled y devuelve una decision booleana para el llamador.
     */
    public boolean isPkceEnabled() {
        return billingProperties.getMercadopago().getReservations().getOauth().isPkceEnabled();
    }

    /**
     * Resuelve signing secret normalizando entradas, defaults y casos borde.
     */
    private String resolveSigningSecret() {
        BillingProperties.MercadoPago.OAuth oauth = billingProperties.getMercadopago().getReservations().getOauth();
        if (oauth.getStateSigningSecret() != null && !oauth.getStateSigningSecret().isBlank()) {
            return oauth.getStateSigningSecret();
        }
        if (oauth.getTokenEncryptionKey() != null && !oauth.getTokenEncryptionKey().isBlank()) {
            return oauth.getTokenEncryptionKey();
        }
        if (oauth.getClientSecret() != null && !oauth.getClientSecret().isBlank()) {
            return oauth.getClientSecret();
        }
        throw new ResponseStatusException(
            HttpStatus.SERVICE_UNAVAILABLE,
            "Falta configurar BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_STATE_SIGNING_SECRET o una clave OAuth equivalente para validar state"
        );
    }

    /**
     * Bloque de datos generated state dentro de la respuesta principal.
     * Agrupa metricas relacionadas para que el frontend no tenga que reconstruirlas.
     */
    public record GeneratedState(String value, LocalDateTime expiresAt, PkceChallenge pkceChallenge) {}

    /**
     * Bloque de datos pkce challenge dentro de la respuesta principal.
     * Agrupa metricas relacionadas para que el frontend no tenga que reconstruirlas.
     */
    public record PkceChallenge(String codeVerifier, String codeChallenge, String codeChallengeMethod) {}

    /**
     * Parsea d estado y convierte errores de formato en errores controlados.
     */
    private record ParsedState(Long professionalId, long issuedAtEpoch) {}
}
