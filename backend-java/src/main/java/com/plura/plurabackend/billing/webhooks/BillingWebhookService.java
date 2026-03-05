package com.plura.plurabackend.billing.webhooks;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.plura.plurabackend.billing.BillingProperties;
import com.plura.plurabackend.billing.payments.PaymentEventLedgerService;
import com.plura.plurabackend.billing.payments.model.PaymentProvider;
import com.plura.plurabackend.billing.webhooks.signature.DLocalWebhookSignatureVerifier;
import com.plura.plurabackend.billing.webhooks.signature.MercadoPagoWebhookSignatureVerifier;
import com.plura.plurabackend.billing.webhooks.signature.SignatureUtils;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BillingWebhookService {

    private static final Logger LOGGER = LoggerFactory.getLogger(BillingWebhookService.class);

    private final BillingProperties billingProperties;
    private final MercadoPagoWebhookSignatureVerifier mercadoPagoSignatureVerifier;
    private final DLocalWebhookSignatureVerifier dlocalSignatureVerifier;
    private final PaymentEventLedgerService paymentEventLedgerService;
    private final WebhookEventProcessor webhookEventProcessor;
    private final MeterRegistry meterRegistry;
    private final ObjectMapper objectMapper;
    private final ZoneId systemZoneId;

    public BillingWebhookService(
        BillingProperties billingProperties,
        MercadoPagoWebhookSignatureVerifier mercadoPagoSignatureVerifier,
        DLocalWebhookSignatureVerifier dlocalSignatureVerifier,
        PaymentEventLedgerService paymentEventLedgerService,
        WebhookEventProcessor webhookEventProcessor,
        MeterRegistry meterRegistry,
        ObjectMapper objectMapper,
        @Value("${app.timezone:America/Montevideo}") String appTimezone
    ) {
        this.billingProperties = billingProperties;
        this.mercadoPagoSignatureVerifier = mercadoPagoSignatureVerifier;
        this.dlocalSignatureVerifier = dlocalSignatureVerifier;
        this.paymentEventLedgerService = paymentEventLedgerService;
        this.webhookEventProcessor = webhookEventProcessor;
        this.meterRegistry = meterRegistry;
        this.objectMapper = objectMapper;
        this.systemZoneId = ZoneId.of(appTimezone);
    }

    public WebhookHandleResult handleMercadoPago(HttpServletRequest request, String rawPayload) {
        if (!billingProperties.isEnabled() || !billingProperties.getMercadopago().isEnabled()) {
            return WebhookHandleResult.IGNORED;
        }

        String requestId = resolveRequestId(request);
        LOGGER.info("Webhook recibido provider={} requestId={}", PaymentProvider.MERCADOPAGO, requestId);
        increment("received", PaymentProvider.MERCADOPAGO);
        String payload = rawPayload == null ? "{}" : rawPayload;

        if (!mercadoPagoSignatureVerifier.verify(payload, request)) {
            increment("invalid_signature", PaymentProvider.MERCADOPAGO);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Firma de Mercado Pago inválida");
        }

        ParsedWebhookEvent event = parseMercadoPagoEvent(payload, request);
        return registerAndProcess(event, requestId);
    }

    public WebhookHandleResult handleDLocal(HttpServletRequest request, String rawPayload) {
        if (!billingProperties.isEnabled() || !billingProperties.getDlocal().isEnabled()) {
            return WebhookHandleResult.IGNORED;
        }

        String requestId = resolveRequestId(request);
        LOGGER.info("Webhook recibido provider={} requestId={}", PaymentProvider.DLOCAL, requestId);
        increment("received", PaymentProvider.DLOCAL);
        String payload = rawPayload == null ? "{}" : rawPayload;

        if (!dlocalSignatureVerifier.verify(payload, request)) {
            increment("invalid_signature", PaymentProvider.DLOCAL);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Firma de dLocal inválida");
        }

        ParsedWebhookEvent event = parseDlocalEvent(payload, request);
        return registerAndProcess(event, requestId);
    }

    private WebhookHandleResult registerAndProcess(ParsedWebhookEvent event, String requestId) {
        PaymentEventLedgerService.RegistrationResult registration = paymentEventLedgerService.registerReceived(event);
        if (registration.duplicate()) {
            increment("duplicate", event.provider());
            LOGGER.info(
                "Webhook duplicado provider={} requestId={} providerEventId={}",
                event.provider(),
                requestId,
                event.providerEventId()
            );
            return WebhookHandleResult.DUPLICATE;
        }

        try {
            webhookEventProcessor.process(registration.paymentEventId(), event);
            increment("processed", event.provider());
            LOGGER.info(
                "Webhook procesado provider={} requestId={} providerEventId={}",
                event.provider(),
                requestId,
                event.providerEventId()
            );
            return WebhookHandleResult.PROCESSED;
        } catch (RuntimeException exception) {
            increment("failed", event.provider());
            paymentEventLedgerService.markFailed(registration.paymentEventId(), exception.getMessage());
            LOGGER.error(
                "Webhook processing failed provider={} requestId={} providerEventId={} providerObjectId={}",
                event.provider(),
                requestId,
                event.providerEventId(),
                event.providerObjectId(),
                exception
            );
            throw exception;
        }
    }

    private ParsedWebhookEvent parseMercadoPagoEvent(String payload, HttpServletRequest request) {
        try {
            JsonNode root = objectMapper.readTree(payload);
            String providerEventId = firstNonBlank(
                root.path("id").asText(null),
                request.getParameter("id"),
                buildDeterministicEventId(PaymentProvider.MERCADOPAGO, payload, request)
            );
            String providerObjectId = firstNonBlank(
                root.at("/data/id").asText(null),
                root.path("data_id").asText(null)
            );
            String action = safeLower(firstNonBlank(root.path("action").asText(null), root.path("type").asText(null)));
            String status = safeLower(firstNonBlank(
                root.path("status").asText(null),
                root.path("payment_status").asText(null),
                root.at("/data/status").asText(null)
            ));
            WebhookEventType eventType = resolveEventType(action, status);

            Long professionalId = parseLong(firstNonBlank(
                root.path("external_reference").asText(null),
                root.path("external_id").asText(null),
                root.at("/metadata/professionalId").asText(null)
            ));
            String planCode = firstNonBlank(
                root.at("/metadata/planCode").asText(null),
                root.path("plan").asText(null),
                root.path("plan_code").asText(null)
            );

            String providerSubscriptionId = firstNonBlank(
                root.path("preapproval_id").asText(null),
                root.path("subscription_id").asText(null),
                isSubscriptionAction(action) ? providerObjectId : null
            );
            String providerPaymentId = firstNonBlank(
                root.path("payment_id").asText(null),
                !isSubscriptionAction(action) ? providerObjectId : null
            );

            BigDecimal amount = parseDecimal(firstNonBlank(
                root.path("transaction_amount").asText(null),
                root.path("amount").asText(null)
            ));
            String currency = firstNonBlank(root.path("currency_id").asText(null), root.path("currency").asText(null));

            LocalDateTime eventTime = parseDateTime(firstNonBlank(
                root.path("date_approved").asText(null),
                root.path("date_created").asText(null),
                root.path("date_last_updated").asText(null)
            ));

            boolean cancelAtPeriodEnd = root.path("cancel_at_period_end").asBoolean(false);

            return new ParsedWebhookEvent(
                PaymentProvider.MERCADOPAGO,
                providerEventId,
                providerObjectId,
                eventType,
                professionalId,
                providerSubscriptionId,
                providerPaymentId,
                amount,
                currency,
                planCode,
                cancelAtPeriodEnd,
                eventTime,
                SignatureUtils.sha256Hex(payload),
                buildSafePayload(root)
            );
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payload de Mercado Pago inválido");
        }
    }

    private ParsedWebhookEvent parseDlocalEvent(String payload, HttpServletRequest request) {
        try {
            JsonNode root = objectMapper.readTree(payload);
            String providerEventId = firstNonBlank(
                root.path("event_id").asText(null),
                root.path("id").asText(null),
                buildDeterministicEventId(PaymentProvider.DLOCAL, payload, request)
            );
            String providerObjectId = firstNonBlank(
                root.path("payment_id").asText(null),
                root.path("subscription_id").asText(null),
                root.path("id").asText(null)
            );
            String type = safeLower(firstNonBlank(root.path("event_type").asText(null), root.path("type").asText(null)));
            String status = safeLower(firstNonBlank(root.path("payment_status").asText(null), root.path("status").asText(null)));
            WebhookEventType eventType = resolveEventType(type, status);

            Long professionalId = parseLong(firstNonBlank(
                root.path("external_id").asText(null),
                root.path("external_reference").asText(null),
                root.at("/metadata/professionalId").asText(null)
            ));
            String planCode = firstNonBlank(
                root.at("/metadata/planCode").asText(null),
                root.path("plan_code").asText(null),
                root.path("plan").asText(null)
            );

            String providerSubscriptionId = firstNonBlank(
                root.path("subscription_id").asText(null),
                root.path("recurring_id").asText(null)
            );
            String providerPaymentId = firstNonBlank(
                root.path("payment_id").asText(null),
                root.path("id").asText(null)
            );

            BigDecimal amount = parseDecimal(firstNonBlank(root.path("amount").asText(null), root.path("value").asText(null)));
            String currency = firstNonBlank(root.path("currency").asText(null), root.path("currency_id").asText(null));
            LocalDateTime eventTime = parseDateTime(firstNonBlank(
                root.path("created_at").asText(null),
                root.path("event_date").asText(null),
                root.path("date").asText(null)
            ));

            boolean cancelAtPeriodEnd = root.path("cancel_at_period_end").asBoolean(false);

            return new ParsedWebhookEvent(
                PaymentProvider.DLOCAL,
                providerEventId,
                providerObjectId,
                eventType,
                professionalId,
                providerSubscriptionId,
                providerPaymentId,
                amount,
                currency,
                planCode,
                cancelAtPeriodEnd,
                eventTime,
                SignatureUtils.sha256Hex(payload),
                buildSafePayload(root)
            );
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payload de dLocal inválido");
        }
    }

    private WebhookEventType resolveEventType(String eventType, String status) {
        String type = eventType == null ? "" : eventType;
        String paymentStatus = status == null ? "" : status;

        if (containsAny(type, "refund", "chargeback") || containsAny(paymentStatus, "refund", "chargeback")) {
            return WebhookEventType.PAYMENT_REFUNDED;
        }
        if (containsAny(type, "cancel") || containsAny(paymentStatus, "cancelled", "canceled")) {
            return WebhookEventType.SUBSCRIPTION_CANCELLED;
        }
        if (containsAny(type, "renew") || containsAny(type, "recurring")) {
            return WebhookEventType.SUBSCRIPTION_RENEWED;
        }
        if (containsAny(paymentStatus, "approved", "paid", "authorized", "success")) {
            return WebhookEventType.PAYMENT_SUCCEEDED;
        }
        if (containsAny(paymentStatus, "rejected", "failed", "expired", "denied")) {
            return WebhookEventType.PAYMENT_FAILED;
        }

        return WebhookEventType.UNKNOWN;
    }

    private boolean isSubscriptionAction(String action) {
        if (action == null) {
            return false;
        }
        return containsAny(action, "preapproval", "subscription", "recurring");
    }

    private boolean containsAny(String value, String... expectedTokens) {
        if (value == null || value.isBlank()) {
            return false;
        }
        String normalized = value.toLowerCase(Locale.ROOT);
        for (String token : expectedTokens) {
            if (normalized.contains(token.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        return false;
    }

    private Long parseLong(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Long.valueOf(value.trim());
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private BigDecimal parseDecimal(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(value.trim());
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private LocalDateTime parseDateTime(String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            return null;
        }

        String value = rawValue.trim();
        List<DateTimeFormatter> formatters = List.of(
            DateTimeFormatter.ISO_OFFSET_DATE_TIME,
            DateTimeFormatter.ISO_ZONED_DATE_TIME,
            DateTimeFormatter.ISO_INSTANT,
            DateTimeFormatter.ISO_LOCAL_DATE_TIME
        );

        for (DateTimeFormatter formatter : formatters) {
            try {
                if (formatter == DateTimeFormatter.ISO_LOCAL_DATE_TIME) {
                    return LocalDateTime.parse(value, formatter);
                }
                Instant instant = formatter.parse(value, Instant::from);
                return LocalDateTime.ofInstant(instant, systemZoneId);
            } catch (DateTimeParseException ignored) {
                // Probar siguiente formato.
            }
        }

        return null;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private String safeLower(String value) {
        return value == null ? null : value.toLowerCase(Locale.ROOT);
    }

    private String buildSafePayload(JsonNode root) {
        ObjectNode safe = objectMapper.createObjectNode();
        copyIfPresent(root, safe, "id");
        copyIfPresent(root, safe, "type");
        copyIfPresent(root, safe, "action");
        copyIfPresent(root, safe, "status");
        copyIfPresent(root, safe, "payment_status");
        copyIfPresent(root, safe, "external_reference");
        copyIfPresent(root, safe, "external_id");
        copyIfPresent(root, safe, "subscription_id");
        copyIfPresent(root, safe, "payment_id");

        JsonNode dataId = root.at("/data/id");
        if (!dataId.isMissingNode() && !dataId.isNull()) {
            safe.put("data_id", dataId.asText());
        }

        return safe.toString();
    }

    private void copyIfPresent(JsonNode source, ObjectNode target, String fieldName) {
        JsonNode value = source.get(fieldName);
        if (value != null && !value.isNull()) {
            target.set(fieldName, value);
        }
    }

    private String buildDeterministicEventId(
        PaymentProvider provider,
        String payload,
        HttpServletRequest request
    ) {
        String source = provider.name()
            + "|"
            + (payload == null ? "" : payload)
            + "|"
            + firstNonBlank(request.getHeader("X-Request-Id"), request.getHeader("X-Signature"), "");
        return SignatureUtils.sha256Hex(source);
    }

    private void increment(String outcome, PaymentProvider provider) {
        meterRegistry.counter(
            "billing.webhook.events",
            "provider", provider.name().toLowerCase(Locale.ROOT),
            "outcome", outcome
        ).increment();
    }

    private String resolveRequestId(HttpServletRequest request) {
        String requestId = firstNonBlank(
            request.getHeader("X-Request-Id"),
            request.getHeader("X-Correlation-Id")
        );
        if (requestId != null) {
            return requestId;
        }
        return UUID.randomUUID().toString();
    }
}
