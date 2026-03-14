package com.plura.plurabackend.core.billing.webhooks.signature;

import com.plura.plurabackend.core.billing.BillingProperties;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Enumeration;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicBoolean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class DLocalWebhookSignatureVerifier {

    private static final Logger LOGGER = LoggerFactory.getLogger(DLocalWebhookSignatureVerifier.class);
    private static final AtomicBoolean UNKNOWN_MODE_WARNED = new AtomicBoolean(false);

    private final BillingProperties billingProperties;

    public DLocalWebhookSignatureVerifier(BillingProperties billingProperties) {
        this.billingProperties = billingProperties;
    }

    public boolean verify(String rawPayload, HttpServletRequest request) {
        BillingProperties.DLocal config = billingProperties.getDlocal();
        String secret = config.getWebhookSecret();
        if (secret == null || secret.isBlank()) {
            return false;
        }

        String providedSignature = firstNonBlank(
            headerIgnoreCase(request, "x-dlocal-signature"),
            headerIgnoreCase(request, "x-signature")
        );
        if (providedSignature == null || providedSignature.isBlank()) {
            return false;
        }

        String signatureOnly = stripVersionPrefix(providedSignature);
        String body = rawPayload == null ? "" : rawPayload;
        String xDate = headerIgnoreCase(request, "x-date");
        String mode = config.getSignatureMode() == null
            ? BillingProperties.DLocal.STRICT_DATE_BODY
            : config.getSignatureMode().trim().toUpperCase(Locale.ROOT);

        boolean strictValid = switch (mode) {
            case BillingProperties.DLocal.STRICT_DATE_BODY -> verifyStrictDateBody(secret, xDate, body, signatureOnly);
            default -> {
                warnUnknownMode(mode);
                yield false;
            }
        };
        if (strictValid) {
            return true;
        }

        String apiBodyExpected = SignatureUtils.hmacSha256Hex(
            secret,
            (config.getXLogin() == null ? "" : config.getXLogin()) + body
        );
        if (SignatureUtils.constantTimeEquals(apiBodyExpected, signatureOnly)) {
            return true;
        }

        if (billingProperties.isProductionMode() || !config.isSandboxOnlyBodySignatureFallback()) {
            return false;
        }
        String expectedBody = SignatureUtils.hmacSha256Hex(secret, body);
        if (SignatureUtils.constantTimeEquals(expectedBody, signatureOnly)) {
            LOGGER.warn("dLocal signature accepted by sandbox fallback mode");
            return true;
        }
        return false;
    }

    private boolean verifyStrictDateBody(String secret, String xDate, String body, String signatureOnly) {
        if (xDate == null || xDate.isBlank()) {
            return false;
        }
        if (!isWithinReplayWindow(xDate)) {
            return false;
        }
        String expectedDateBody = SignatureUtils.hmacSha256Hex(secret, xDate + body);
        return SignatureUtils.constantTimeEquals(expectedDateBody, signatureOnly);
    }

    private boolean isWithinReplayWindow(String xDate) {
        try {
            Instant headerInstant = parseInstant(xDate);
            long skew = Math.abs(Instant.now().getEpochSecond() - headerInstant.getEpochSecond());
            return skew <= billingProperties.getWebhookAllowedSkewSeconds();
        } catch (DateTimeParseException exception) {
            return false;
        }
    }

    private Instant parseInstant(String xDate) {
        String value = xDate.trim();
        try {
            return Instant.parse(value);
        } catch (DateTimeParseException exception) {
            return ZonedDateTime.parse(value, DateTimeFormatter.RFC_1123_DATE_TIME).toInstant();
        }
    }

    private void warnUnknownMode(String mode) {
        if (UNKNOWN_MODE_WARNED.compareAndSet(false, true)) {
            LOGGER.warn(
                "Unknown dLocal signature mode '{}' configured. Expected STRICT_DATE_BODY. Webhook signature strict mode is active.",
                mode
            );
        }
    }

    private String stripVersionPrefix(String value) {
        String normalized = value.trim();
        int index = normalized.indexOf('=');
        if (index > 0 && normalized.substring(0, index).matches("[A-Za-z0-9_\\-]+")) {
            return normalized.substring(index + 1).trim();
        }
        return normalized;
    }

    private String firstNonBlank(String first, String second) {
        if (first != null && !first.isBlank()) {
            return first;
        }
        if (second != null && !second.isBlank()) {
            return second;
        }
        return null;
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
