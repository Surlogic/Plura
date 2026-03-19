package com.plura.plurabackend.core.billing.providerconnection.mercadopago;

import com.plura.plurabackend.core.billing.BillingProperties;
import com.plura.plurabackend.core.billing.webhooks.signature.SignatureUtils;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MercadoPagoOAuthStateService {

    private static final long STATE_TTL_SECONDS = 900L;

    private final BillingProperties billingProperties;
    private final SecureRandom secureRandom = new SecureRandom();

    public MercadoPagoOAuthStateService(BillingProperties billingProperties) {
        this.billingProperties = billingProperties;
    }

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
            LocalDateTime.ofInstant(Instant.ofEpochSecond(issuedAt + STATE_TTL_SECONDS), ZoneOffset.UTC)
        );
    }

    public void validateState(String rawState, Long expectedProfessionalId) {
        if (rawState == null || rawState.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "state OAuth es obligatorio");
        }
        if (expectedProfessionalId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "professionalId esperado es obligatorio");
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
        if (!expectedProfessionalId.equals(professionalId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "state OAuth no pertenece al profesional autenticado");
        }
        long nowEpoch = Instant.now().getEpochSecond();
        if (issuedAtEpoch <= 0 || nowEpoch - issuedAtEpoch > STATE_TTL_SECONDS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "state OAuth expirado");
        }
    }

    private String randomNonce() {
        byte[] randomBytes = new byte[18];
        secureRandom.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    private String resolveSigningSecret() {
        BillingProperties.MercadoPago.OAuth oauth = billingProperties.getMercadopago().getOauth();
        if (oauth.getTokenEncryptionKey() != null && !oauth.getTokenEncryptionKey().isBlank()) {
            return oauth.getTokenEncryptionKey();
        }
        if (oauth.getClientSecret() != null && !oauth.getClientSecret().isBlank()) {
            return oauth.getClientSecret();
        }
        throw new ResponseStatusException(
            HttpStatus.SERVICE_UNAVAILABLE,
            "Falta configurar secreto para validar state OAuth de Mercado Pago"
        );
    }

    public record GeneratedState(String value, LocalDateTime expiresAt) {}
}
