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
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Component
public class MercadoPagoPaymentProviderClient implements PaymentProviderClient {

    private static final Logger LOGGER = LoggerFactory.getLogger(MercadoPagoPaymentProviderClient.class);

    private final BillingProperties billingProperties;
    private final ObjectMapper objectMapper;

    public MercadoPagoPaymentProviderClient(
        BillingProperties billingProperties,
        ObjectMapper objectMapper
    ) {
        this.billingProperties = billingProperties;
        this.objectMapper = objectMapper;
    }

    @Override
    public PaymentProvider provider() {
        return PaymentProvider.MERCADOPAGO;
    }

    @Override
    public ProviderCheckoutSession createCheckout(ProviderCheckoutRequest request) {
        BillingProperties.MercadoPago config = billingProperties.getMercadopago();
        if (!config.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Mercado Pago deshabilitado");
        }

        String endpoint = config.getBaseUrl() + config.getCheckoutPath();
        HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofMillis(config.getTimeoutMillis()))
            .build();

        try {
            Map<String, Object> payload = buildCheckoutPayload(request, config);
            String body = objectMapper.writeValueAsString(payload);

            HttpRequest httpRequest = HttpRequest.newBuilder(URI.create(endpoint))
                .timeout(Duration.ofMillis(config.getTimeoutMillis()))
                .header("Authorization", "Bearer " + config.getAccessToken())
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                LOGGER.warn("MercadoPago checkout rejected status={} subscriptionId={}", response.statusCode(), request.subscriptionId());
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "No se pudo crear checkout en Mercado Pago");
            }

            JsonNode json = objectMapper.readTree(response.body());
            String checkoutUrl = firstNonBlank(
                json.path("sandbox_init_point").asText(null),
                json.path("init_point").asText(null)
            );
            if (checkoutUrl == null) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Mercado Pago no devolvió checkoutUrl");
            }

            String providerSubscriptionId = json.path("id").asText(null);
            String providerCustomerId = json.path("collector_id").asText(null);

            return new ProviderCheckoutSession(checkoutUrl, providerSubscriptionId, providerCustomerId);
        } catch (IOException | InterruptedException exception) {
            if (exception instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            LOGGER.error("MercadoPago checkout error subscriptionId={}", request.subscriptionId(), exception);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Error al crear checkout de Mercado Pago");
        }
    }

    @Override
    public void cancelSubscription(String providerSubscriptionId, boolean immediate) {
        if (providerSubscriptionId == null || providerSubscriptionId.isBlank()) {
            return;
        }

        BillingProperties.MercadoPago config = billingProperties.getMercadopago();
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
            payload.put("status", immediate ? "cancelled" : "paused");
            String body = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder(URI.create(endpoint))
                .timeout(Duration.ofMillis(config.getTimeoutMillis()))
                .header("Authorization", "Bearer " + config.getAccessToken())
                .header("Content-Type", "application/json")
                .PUT(HttpRequest.BodyPublishers.ofString(body))
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                LOGGER.warn(
                    "MercadoPago cancel rejected status={} providerSubscriptionId={}",
                    response.statusCode(),
                    providerSubscriptionId
                );
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "No se pudo cancelar la suscripción en Mercado Pago");
            }
        } catch (IOException | InterruptedException exception) {
            if (exception instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            LOGGER.error("MercadoPago cancel error providerSubscriptionId={}", providerSubscriptionId, exception);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Error al cancelar suscripción en Mercado Pago");
        }
    }

    @Override
    public ProviderVerificationResult verifyPayment(ProviderVerificationRequest request) {
        BillingProperties.MercadoPago config = billingProperties.getMercadopago();
        if (!config.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Mercado Pago deshabilitado");
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
            HttpRequest httpRequest = HttpRequest.newBuilder(URI.create(endpoint))
                .timeout(Duration.ofMillis(config.getTimeoutMillis()))
                .header("Authorization", "Bearer " + config.getAccessToken())
                .header("Content-Type", "application/json")
                .GET()
                .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                LOGGER.warn("MercadoPago verify rejected status={} objectId={}", response.statusCode(), objectId);
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "No se pudo verificar pago en Mercado Pago");
            }

            JsonNode root = objectMapper.readTree(response.body());
            String status = firstNonBlank(
                root.path("status").asText(null),
                root.path("status_detail").asText(null)
            );
            BigDecimal amount = parseDecimal(firstNonBlank(
                root.path("transaction_amount").asText(null),
                root.at("/auto_recurring/transaction_amount").asText(null),
                root.path("amount").asText(null)
            ));
            String currency = firstNonBlank(
                root.path("currency_id").asText(null),
                root.at("/auto_recurring/currency_id").asText(null),
                root.path("currency").asText(null)
            );
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
            LOGGER.error("MercadoPago verify error objectId={}", objectId, exception);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Error al verificar pago de Mercado Pago");
        }
    }

    private Map<String, Object> buildCheckoutPayload(
        ProviderCheckoutRequest request,
        BillingProperties.MercadoPago config
    ) {
        Map<String, Object> item = new HashMap<>();
        item.put("title", "Plura " + request.plan().name());
        item.put("quantity", 1);
        item.put("currency_id", request.currency());
        item.put("unit_price", toNumber(request.amount()));

        Map<String, Object> payload = new HashMap<>();
        payload.put("items", List.of(item));
        payload.put("external_reference", String.valueOf(request.professionalId()));
        payload.put("metadata", Map.of(
            "professionalId", request.professionalId(),
            "subscriptionId", request.subscriptionId(),
            "planCode", request.plan().name()
        ));

        if (request.webhookUrl() != null && !request.webhookUrl().isBlank()) {
            payload.put("notification_url", request.webhookUrl());
        }
        if (hasAny(config.getSuccessUrl(), config.getFailureUrl(), config.getPendingUrl())) {
            Map<String, Object> backUrls = new HashMap<>();
            if (config.getSuccessUrl() != null && !config.getSuccessUrl().isBlank()) {
                backUrls.put("success", config.getSuccessUrl());
            }
            if (config.getFailureUrl() != null && !config.getFailureUrl().isBlank()) {
                backUrls.put("failure", config.getFailureUrl());
            }
            if (config.getPendingUrl() != null && !config.getPendingUrl().isBlank()) {
                backUrls.put("pending", config.getPendingUrl());
            }
            payload.put("back_urls", backUrls);
        }

        return payload;
    }

    private Number toNumber(BigDecimal amount) {
        if (amount.scale() <= 0) {
            return amount.longValue();
        }
        return amount.doubleValue();
    }

    private boolean hasAny(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return true;
            }
        }
        return false;
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
            || normalized.equals("authorized")
            || normalized.equals("active");
    }
}
