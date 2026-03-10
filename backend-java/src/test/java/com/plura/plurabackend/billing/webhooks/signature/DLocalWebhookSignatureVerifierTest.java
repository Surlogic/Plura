package com.plura.plurabackend.billing.webhooks.signature;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.plura.plurabackend.billing.BillingProperties;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class DLocalWebhookSignatureVerifierTest {

    @Test
    void shouldValidateStrictDateBodySignature() {
        BillingProperties properties = new BillingProperties();
        properties.getDlocal().setWebhookSecret("dl-secret");
        properties.getDlocal().setSignatureMode(BillingProperties.DLocal.STRICT_DATE_BODY);

        DLocalWebhookSignatureVerifier verifier = new DLocalWebhookSignatureVerifier(properties);

        String payload = "{\"payment_id\":\"pay-1\"}";
        String xDate = Instant.now().toString();
        String signature = SignatureUtils.hmacSha256Hex("dl-secret", xDate + payload);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Date", xDate);
        request.addHeader("X-Dlocal-Signature", "v1=" + signature);

        assertTrue(verifier.verify(payload, request));
    }

    @Test
    void shouldRejectWhenDateOutsideReplayWindow() {
        BillingProperties properties = new BillingProperties();
        properties.getDlocal().setWebhookSecret("dl-secret");
        properties.getDlocal().setSignatureMode(BillingProperties.DLocal.STRICT_DATE_BODY);
        properties.setWebhookAllowedSkewSeconds(300);

        DLocalWebhookSignatureVerifier verifier = new DLocalWebhookSignatureVerifier(properties);

        String payload = "{\"payment_id\":\"pay-1\"}";
        String xDate = Instant.now().minusSeconds(600).toString();
        String signature = SignatureUtils.hmacSha256Hex("dl-secret", xDate + payload);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Date", xDate);
        request.addHeader("X-Dlocal-Signature", "v1=" + signature);

        assertFalse(verifier.verify(payload, request));
    }

    @Test
    void shouldRejectInvalidStrictSignature() {
        BillingProperties properties = new BillingProperties();
        properties.getDlocal().setWebhookSecret("dl-secret");
        properties.getDlocal().setSignatureMode(BillingProperties.DLocal.STRICT_DATE_BODY);

        DLocalWebhookSignatureVerifier verifier = new DLocalWebhookSignatureVerifier(properties);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Date", Instant.now().toString());
        request.addHeader("X-Dlocal-Signature", "v1=invalid");

        assertFalse(verifier.verify("{\"payment_id\":\"pay-1\"}", request));
    }

    @Test
    void shouldValidateGoStyleApiKeyPlusBodySignature() {
        BillingProperties properties = new BillingProperties();
        properties.getDlocal().setWebhookSecret("dl-secret");
        properties.getDlocal().setXLogin("dl-api-key");

        DLocalWebhookSignatureVerifier verifier = new DLocalWebhookSignatureVerifier(properties);

        String payload = "{\"id\":\"DP-1\",\"status\":\"PAID\"}";
        String signature = SignatureUtils.hmacSha256Hex("dl-secret", "dl-api-key" + payload);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Dlocal-Signature", "v1=" + signature);

        assertTrue(verifier.verify(payload, request));
    }
}
