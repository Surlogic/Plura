package com.plura.plurabackend.core.billing.providerconnection.security;

import com.plura.plurabackend.core.billing.BillingProperties;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MercadoPagoOAuthTokenCipher {

    private static final int GCM_TAG_BITS = 128;
    private static final int IV_LENGTH_BYTES = 12;

    private final BillingProperties billingProperties;
    private final SecureRandom secureRandom = new SecureRandom();

    public MercadoPagoOAuthTokenCipher(BillingProperties billingProperties) {
        this.billingProperties = billingProperties;
    }

    public String encrypt(String plainText) {
        if (plainText == null || plainText.isBlank()) {
            return null;
        }
        try {
            byte[] iv = new byte[IV_LENGTH_BYTES];
            secureRandom.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, buildKey(), new GCMParameterSpec(GCM_TAG_BITS, iv));
            byte[] encrypted = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            ByteBuffer buffer = ByteBuffer.allocate(iv.length + encrypted.length);
            buffer.put(iv);
            buffer.put(encrypted);
            return Base64.getEncoder().encodeToString(buffer.array());
        } catch (GeneralSecurityException exception) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "No se pudo cifrar token OAuth de Mercado Pago"
            );
        }
    }

    public String decrypt(String cipherText) {
        if (cipherText == null || cipherText.isBlank()) {
            return null;
        }
        try {
            byte[] payload = Base64.getDecoder().decode(cipherText);
            if (payload.length <= IV_LENGTH_BYTES) {
                throw new IllegalArgumentException("cipherText invalido");
            }
            ByteBuffer buffer = ByteBuffer.wrap(payload);
            byte[] iv = new byte[IV_LENGTH_BYTES];
            buffer.get(iv);
            byte[] encrypted = new byte[buffer.remaining()];
            buffer.get(encrypted);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, buildKey(), new GCMParameterSpec(GCM_TAG_BITS, iv));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException exception) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "No se pudo descifrar token OAuth de Mercado Pago"
            );
        }
    }

    private SecretKeySpec buildKey() {
        String keyMaterial = resolveKeyMaterial();
        try {
            byte[] key = MessageDigest.getInstance("SHA-256")
                .digest(keyMaterial.getBytes(StandardCharsets.UTF_8));
            return new SecretKeySpec(key, "AES");
        } catch (GeneralSecurityException exception) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "No se pudo inicializar cifrado OAuth de Mercado Pago"
            );
        }
    }

    private String resolveKeyMaterial() {
        BillingProperties.MercadoPago.OAuth oauth = billingProperties.getMercadopago().getReservations().getOauth();
        String explicitKey = oauth.getTokenEncryptionKey();
        if (explicitKey != null && !explicitKey.isBlank()) {
            return explicitKey;
        }
        String fallbackKey = oauth.getClientSecret();
        if (fallbackKey != null && !fallbackKey.isBlank()) {
            return fallbackKey;
        }
        throw new ResponseStatusException(
            HttpStatus.SERVICE_UNAVAILABLE,
            "Falta configurar clave de cifrado para Mercado Pago OAuth"
        );
    }
}
