package com.plura.plurabackend.billing.webhooks.signature;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.billing.BillingProperties;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.Arrays;
import java.util.Enumeration;
import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
public class MercadoPagoWebhookSignatureVerifier {

    private final BillingProperties billingProperties;
    private final ObjectMapper objectMapper;

    public MercadoPagoWebhookSignatureVerifier(
        BillingProperties billingProperties,
        ObjectMapper objectMapper
    ) {
        this.billingProperties = billingProperties;
        this.objectMapper = objectMapper;
    }

    public boolean verify(String rawPayload, HttpServletRequest request) {
        BillingProperties.MercadoPago config = billingProperties.getMercadopago();
        String secret = config.getWebhookSecret();
        if (secret == null || secret.isBlank()) {
            return false;
        }

        String signatureHeader = headerIgnoreCase(request, "x-signature");
        if (signatureHeader == null || signatureHeader.isBlank()) {
            return false;
        }

        String requestId = headerIgnoreCase(request, "x-request-id");
        String ts = extractToken(signatureHeader, "ts");
        String v1 = extractToken(signatureHeader, "v1");
        String dataId = resolveDataId(rawPayload, request);

        if (ts == null || v1 == null || requestId == null || dataId == null) {
            return false;
        }
        if (!isWithinReplayWindow(ts)) {
            return false;
        }

        if (requestId != null && ts != null && v1 != null && dataId != null) {
            String manifest = "id:" + dataId + ";request-id:" + requestId + ";ts:" + ts + ";";
            String expected = SignatureUtils.hmacSha256Hex(secret, manifest);
            if (SignatureUtils.constantTimeEquals(expected, v1)) {
                return true;
            }
        }

        if (billingProperties.isProductionMode() || !config.isSandboxOnlyBodySignatureFallback()) {
            return false;
        }

        String candidate = v1 != null ? v1 : signatureHeader;
        String expectedBodySignature = SignatureUtils.hmacSha256Hex(secret, rawPayload == null ? "" : rawPayload);
        return SignatureUtils.constantTimeEquals(expectedBodySignature, candidate);
    }

    private boolean isWithinReplayWindow(String ts) {
        try {
            long headerEpochSeconds = Long.parseLong(ts.trim());
            long nowEpochSeconds = Instant.now().getEpochSecond();
            long skew = Math.abs(nowEpochSeconds - headerEpochSeconds);
            return skew <= billingProperties.getWebhookAllowedSkewSeconds();
        } catch (NumberFormatException exception) {
            return false;
        }
    }

    private String resolveDataId(String rawPayload, HttpServletRequest request) {
        String queryDataId = request.getParameter("data.id");
        if (queryDataId != null && !queryDataId.isBlank()) {
            return queryDataId.trim();
        }
        String queryId = request.getParameter("id");
        if (queryId != null && !queryId.isBlank()) {
            return queryId.trim();
        }

        try {
            JsonNode root = objectMapper.readTree(rawPayload == null ? "{}" : rawPayload);
            JsonNode dataId = root.at("/data/id");
            if (!dataId.isMissingNode() && !dataId.isNull()) {
                String value = dataId.asText(null);
                if (value != null && !value.isBlank()) {
                    return value.trim();
                }
            }
            JsonNode id = root.get("id");
            if (id != null && !id.isNull()) {
                String value = id.asText(null);
                if (value != null && !value.isBlank()) {
                    return value.trim();
                }
            }
        } catch (Exception ignored) {
            return null;
        }

        return null;
    }

    private String extractToken(String signatureHeader, String tokenName) {
        return Arrays.stream(signatureHeader.split(","))
            .map(String::trim)
            .map(part -> part.split("=", 2))
            .filter(parts -> parts.length == 2)
            .filter(parts -> tokenName.equalsIgnoreCase(parts[0].trim()))
            .map(parts -> parts[1].trim())
            .findFirst()
            .orElse(null);
    }

    private String headerIgnoreCase(HttpServletRequest request, String headerName) {
        Enumeration<String> names = request.getHeaderNames();
        while (names != null && names.hasMoreElements()) {
            String candidate = names.nextElement();
            if (candidate != null && candidate.toLowerCase(Locale.ROOT).equals(headerName.toLowerCase(Locale.ROOT))) {
                return request.getHeader(candidate);
            }
        }
        return null;
    }
}
