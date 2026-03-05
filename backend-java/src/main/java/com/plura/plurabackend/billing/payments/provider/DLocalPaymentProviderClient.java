package com.plura.plurabackend.billing.payments.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.billing.BillingProperties;
import com.plura.plurabackend.billing.payments.model.PaymentProvider;
import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class DLocalPaymentProviderClient implements PaymentProviderClient {

    private static final Logger LOGGER = LoggerFactory.getLogger(DLocalPaymentProviderClient.class);

    private final BillingProperties billingProperties;
    private final ObjectMapper objectMapper;

    public DLocalPaymentProviderClient(
        BillingProperties billingProperties,
        ObjectMapper objectMapper
    ) {
        this.billingProperties = billingProperties;
        this.objectMapper = objectMapper;
    }

    @Override
    public PaymentProvider provider() {
        return PaymentProvider.DLOCAL;
    }

    @Override
    public ProviderCheckoutSession createCheckout(ProviderCheckoutRequest request) {
        BillingProperties.DLocal config = billingProperties.getDlocal();
        if (!config.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "dLocal deshabilitado");
        }

        String endpoint = config.getBaseUrl() + config.getCheckoutPath();
        HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofMillis(config.getTimeoutMillis()))
            .build();

        try {
            Map<String, Object> payload = buildCheckoutPayload(request, config);
            String body = objectMapper.writeValueAsString(payload);

            String requestDate = DateTimeFormatter.ISO_INSTANT.format(Instant.now());
            HttpRequest httpRequest = HttpRequest.newBuilder(URI.create(endpoint))
                .timeout(Duration.ofMillis(config.getTimeoutMillis()))
                .header("Content-Type", "application/json")
                .header("X-Login", config.getXLogin())
                .header("X-Trans-Key", config.getXTransKey())
                .header("X-Date", requestDate)
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                LOGGER.warn("dLocal checkout rejected status={} subscriptionId={}", response.statusCode(), request.subscriptionId());
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "No se pudo crear checkout en dLocal");
            }

            JsonNode json = objectMapper.readTree(response.body());
            String checkoutUrl = firstNonBlank(
                json.path("redirect_url").asText(null),
                json.path("checkout_url").asText(null),
                json.path("url").asText(null)
            );
            if (checkoutUrl == null) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "dLocal no devolvió checkoutUrl");
            }

            String providerSubscriptionId = firstNonBlank(
                json.path("subscription_id").asText(null),
                json.path("id").asText(null)
            );
            String providerCustomerId = firstNonBlank(
                json.path("customer_id").asText(null),
                json.path("payer_id").asText(null)
            );

            return new ProviderCheckoutSession(checkoutUrl, providerSubscriptionId, providerCustomerId);
        } catch (IOException | InterruptedException exception) {
            if (exception instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            LOGGER.error("dLocal checkout error subscriptionId={}", request.subscriptionId(), exception);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Error al crear checkout de dLocal");
        }
    }

    @Override
    public void cancelSubscription(String providerSubscriptionId, boolean immediate) {
        if (providerSubscriptionId == null || providerSubscriptionId.isBlank()) {
            return;
        }

        BillingProperties.DLocal config = billingProperties.getDlocal();
        if (!config.isEnabled()) {
            return;
        }

        String path = config.getCancelPath().replace("{id}", providerSubscriptionId);
        String endpoint = config.getBaseUrl() + path;
        HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofMillis(config.getTimeoutMillis()))
            .build();

        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("reason", immediate ? "user_cancel_immediate" : "user_cancel_period_end");
            String body = objectMapper.writeValueAsString(payload);
            String requestDate = DateTimeFormatter.ISO_INSTANT.format(Instant.now());

            HttpRequest request = HttpRequest.newBuilder(URI.create(endpoint))
                .timeout(Duration.ofMillis(config.getTimeoutMillis()))
                .header("Content-Type", "application/json")
                .header("X-Login", config.getXLogin())
                .header("X-Trans-Key", config.getXTransKey())
                .header("X-Date", requestDate)
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                LOGGER.warn("dLocal cancel rejected status={} providerSubscriptionId={}", response.statusCode(), providerSubscriptionId);
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "No se pudo cancelar la suscripción en dLocal");
            }
        } catch (IOException | InterruptedException exception) {
            if (exception instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            LOGGER.error("dLocal cancel error providerSubscriptionId={}", providerSubscriptionId, exception);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Error al cancelar suscripción en dLocal");
        }
    }

    @Override
    public ProviderVerificationResult verifyPayment(ProviderVerificationRequest request) {
        BillingProperties.DLocal config = billingProperties.getDlocal();
        if (!config.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "dLocal deshabilitado");
        }

        String objectId = firstNonBlank(request.providerPaymentId(), request.providerSubscriptionId());
        if (objectId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Identificador de pago/suscripción requerido");
        }

        boolean paymentLookup = request.providerPaymentId() != null && !request.providerPaymentId().isBlank();
        String pathTemplate = paymentLookup ? config.getPaymentStatusPath() : config.getSubscriptionStatusPath();
        String endpoint = config.getBaseUrl() + pathTemplate.replace("{id}", objectId);

        HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofMillis(config.getTimeoutMillis()))
            .build();

        try {
            String requestDate = DateTimeFormatter.ISO_INSTANT.format(Instant.now());
            HttpRequest httpRequest = HttpRequest.newBuilder(URI.create(endpoint))
                .timeout(Duration.ofMillis(config.getTimeoutMillis()))
                .header("Content-Type", "application/json")
                .header("X-Login", config.getXLogin())
                .header("X-Trans-Key", config.getXTransKey())
                .header("X-Date", requestDate)
                .GET()
                .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                LOGGER.warn("dLocal verify rejected status={} objectId={}", response.statusCode(), objectId);
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "No se pudo verificar pago en dLocal");
            }

            JsonNode root = objectMapper.readTree(response.body());
            String status = firstNonBlank(
                root.path("payment_status").asText(null),
                root.path("status").asText(null)
            );
            BigDecimal amount = parseDecimal(firstNonBlank(
                root.path("amount").asText(null),
                root.path("value").asText(null)
            ));
            String currency = firstNonBlank(root.path("currency").asText(null), root.path("currency_id").asText(null));
            Long professionalId = parseLong(firstNonBlank(
                root.path("external_id").asText(null),
                root.path("external_reference").asText(null),
                root.at("/metadata/professionalId").asText(null)
            ));
            String planCode = firstNonBlank(
                root.at("/metadata/planCode").asText(null),
                root.path("plan").asText(null),
                root.path("plan_code").asText(null)
            );

            boolean approved = isApprovedStatus(status);
            return new ProviderVerificationResult(
                approved,
                status,
                amount,
                currency,
                professionalId,
                planCode,
                objectId
            );
        } catch (IOException | InterruptedException exception) {
            if (exception instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            LOGGER.error("dLocal verify error objectId={}", objectId, exception);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Error al verificar pago de dLocal");
        }
    }

    private Map<String, Object> buildCheckoutPayload(
        ProviderCheckoutRequest request,
        BillingProperties.DLocal config
    ) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("amount", request.amount());
        payload.put("currency", request.currency());
        payload.put("country", config.getCountry());
        payload.put("order_id", request.subscriptionId());
        payload.put("description", "Plura " + request.plan().name());
        payload.put("external_id", String.valueOf(request.professionalId()));

        if (request.customerEmail() != null && !request.customerEmail().isBlank()) {
            Map<String, Object> payer = new HashMap<>();
            payer.put("email", request.customerEmail());
            if (request.customerName() != null && !request.customerName().isBlank()) {
                payer.put("name", request.customerName());
            }
            payload.put("payer", payer);
        }

        if (request.webhookUrl() != null && !request.webhookUrl().isBlank()) {
            payload.put("notification_url", request.webhookUrl());
        }
        if (config.getSuccessUrl() != null && !config.getSuccessUrl().isBlank()) {
            payload.put("success_url", config.getSuccessUrl());
        }
        if (config.getFailureUrl() != null && !config.getFailureUrl().isBlank()) {
            payload.put("back_url", config.getFailureUrl());
        }

        return payload;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private BigDecimal parseDecimal(String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(rawValue.trim());
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private Long parseLong(String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            return null;
        }
        try {
            return Long.valueOf(rawValue.trim());
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private boolean isApprovedStatus(String status) {
        if (status == null || status.isBlank()) {
            return false;
        }
        String normalized = status.trim().toLowerCase(Locale.ROOT);
        return normalized.equals("approved")
            || normalized.equals("paid")
            || normalized.equals("success")
            || normalized.equals("authorized")
            || normalized.equals("active");
    }
}
