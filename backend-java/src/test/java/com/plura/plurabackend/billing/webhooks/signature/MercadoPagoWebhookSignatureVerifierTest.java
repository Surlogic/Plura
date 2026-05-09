package com.plura.plurabackend.core.billing.webhooks.signature;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.billing.BillingProperties;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

/**
 * Tests de billing, pagos, webhooks y proveedores / webhooks.
 * Cubren escenarios de Mercado Pago webhook firma verificador para documentar el comportamiento esperado y evitar regresiones.
 * Mantener estos casos alineados con los contratos reales del backend cuando cambie la logica productiva.
 */
class MercadoPagoWebhookSignatureVerifierTest {

    /**
     * Escenario: debe validar official manifest firma.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void shouldValidateOfficialManifestSignature() {
        BillingProperties properties = new BillingProperties();
        properties.getMercadopago().getSubscriptions().setWebhookSecret("mp-secret");

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

    /**
     * Escenario: debe rechazar invalido firma.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void shouldRejectInvalidSignature() {
        BillingProperties properties = new BillingProperties();
        properties.getMercadopago().getSubscriptions().setWebhookSecret("mp-secret");

        MercadoPagoWebhookSignatureVerifier verifier = new MercadoPagoWebhookSignatureVerifier(
            properties,
            new ObjectMapper()
        );

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Request-Id", "req-1");
        request.addHeader("X-Signature", "ts=" + Instant.now().getEpochSecond() + ",v1=invalid");

        assertFalse(verifier.verify("{\"data\":{\"id\":\"pay-123\"}}", request));
    }

    /**
     * Escenario: debe rechazar vencido timestamp outside replay window.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void shouldRejectExpiredTimestampOutsideReplayWindow() {
        BillingProperties properties = new BillingProperties();
        properties.getMercadopago().getSubscriptions().setWebhookSecret("mp-secret");
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

    /**
     * Escenario: debe validar manifest firma con reservation webhook secret.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void shouldValidateManifestSignatureWithReservationWebhookSecret() {
        BillingProperties properties = new BillingProperties();
        properties.getMercadopago().getReservations().setWebhookSecret("mp-reservation-secret");

        MercadoPagoWebhookSignatureVerifier verifier = new MercadoPagoWebhookSignatureVerifier(
            properties,
            new ObjectMapper()
        );

        String payload = "{\"data\":{\"id\":\"pay-123\"}}";
        String ts = String.valueOf(Instant.now().getEpochSecond());
        String requestId = "req-1";
        String manifest = "id:pay-123;request-id:req-1;ts:" + ts + ";";
        String signature = SignatureUtils.hmacSha256Hex("mp-reservation-secret", manifest);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Request-Id", requestId);
        request.addHeader("X-Signature", "ts=" + ts + ",v1=" + signature);

        assertTrue(verifier.verify(payload, request));
    }
}
