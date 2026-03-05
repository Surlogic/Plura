package com.plura.plurabackend.billing.webhooks.signature;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.billing.BillingProperties;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class MercadoPagoWebhookSignatureVerifierTest {

    @Test
    void shouldValidateOfficialManifestSignature() {
        BillingProperties properties = new BillingProperties();
        properties.getMercadopago().setWebhookSecret("mp-secret");

        MercadoPagoWebhookSignatureVerifier verifier = new MercadoPagoWebhookSignatureVerifier(
            properties,
            new ObjectMapper()
        );

        String payload = "{\"data\":{\"id\":\"pay-123\"}}";
        String ts = String.valueOf(Instant.now().getEpochSecond());
        String requestId = "req-1";
        String manifest = "id:pay-123;request-id:req-1;ts:" + ts + ";";
        String signature = SignatureUtils.hmacSha256Hex("mp-secret", manifest);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Request-Id", requestId);
        request.addHeader("X-Signature", "ts=" + ts + ",v1=" + signature);

        assertTrue(verifier.verify(payload, request));
    }

    @Test
    void shouldRejectInvalidSignature() {
        BillingProperties properties = new BillingProperties();
        properties.getMercadopago().setWebhookSecret("mp-secret");

        MercadoPagoWebhookSignatureVerifier verifier = new MercadoPagoWebhookSignatureVerifier(
            properties,
            new ObjectMapper()
        );

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Request-Id", "req-1");
        request.addHeader("X-Signature", "ts=" + Instant.now().getEpochSecond() + ",v1=invalid");

        assertFalse(verifier.verify("{\"data\":{\"id\":\"pay-123\"}}", request));
    }

    @Test
    void shouldRejectExpiredTimestampOutsideReplayWindow() {
        BillingProperties properties = new BillingProperties();
        properties.getMercadopago().setWebhookSecret("mp-secret");
        properties.setWebhookAllowedSkewSeconds(300);

        MercadoPagoWebhookSignatureVerifier verifier = new MercadoPagoWebhookSignatureVerifier(
            properties,
            new ObjectMapper()
        );

        String oldTs = String.valueOf(Instant.now().minusSeconds(600).getEpochSecond());
        String manifest = "id:pay-123;request-id:req-1;ts:" + oldTs + ";";
        String signature = SignatureUtils.hmacSha256Hex("mp-secret", manifest);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Request-Id", "req-1");
        request.addHeader("X-Signature", "ts=" + oldTs + ",v1=" + signature);

        assertFalse(verifier.verify("{\"data\":{\"id\":\"pay-123\"}}", request));
    }
}
