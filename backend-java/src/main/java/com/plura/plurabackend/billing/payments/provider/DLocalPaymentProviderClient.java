package com.plura.plurabackend.billing.payments.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.billing.BillingProperties;
import com.plura.plurabackend.billing.payments.model.PaymentProvider;
import com.plura.plurabackend.billing.webhooks.signature.SignatureUtils;
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
import java.util.Base64;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class DLocalPaymentProviderClient implements PaymentProviderClient {

    private static final Logger LOGGER = LoggerFactory.getLogger(DLocalPaymentProviderClient.class);
    private static final String DLOCAL_API_VERSION = "2.1";
    private static final String DLOCAL_USER_AGENT = "PluraBackend/1.0";

    private final BillingProperties billingProperties;
    private final ObjectMapper objectMapper;
    private volatile String payoutAccessToken;
    private volatile Instant payoutAccessTokenExpiresAt;

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
            HttpRequest httpRequest = applySignedHeaders(
                HttpRequest.newBuilder(URI.create(endpoint)),
                config,
                requestDate,
                body
            )
                .timeout(Duration.ofMillis(config.getTimeoutMillis()))
                .header("Content-Type", "application/json")
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
    public ProviderCheckoutSession createBookingCheckout(BookingProviderCheckoutRequest request) {
        BillingProperties.DLocal config = billingProperties.getDlocal();
        if (!config.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "dLocal deshabilitado");
        }

        String endpoint = config.getBaseUrl() + config.getCheckoutPath();
        HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofMillis(config.getTimeoutMillis()))
            .build();

        try {
            Map<String, Object> payload = buildBookingCheckoutPayload(request, config);
            String body = objectMapper.writeValueAsString(payload);
            String requestDate = DateTimeFormatter.ISO_INSTANT.format(Instant.now());

            HttpRequest httpRequest = applySignedHeaders(
                HttpRequest.newBuilder(URI.create(endpoint)),
                config,
                requestDate,
                body
            )
                .timeout(Duration.ofMillis(config.getTimeoutMillis()))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                LOGGER.warn("dLocal booking checkout rejected status={} bookingId={}", response.statusCode(), request.bookingId());
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "No se pudo crear checkout de reserva en dLocal");
            }

            JsonNode json = objectMapper.readTree(response.body());
            String checkoutUrl = firstNonBlank(
                json.path("redirect_url").asText(null),
                json.path("checkout_url").asText(null),
                json.path("url").asText(null)
            );
            if (checkoutUrl == null) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "dLocal no devolvió checkoutUrl para reserva");
            }

            String providerPaymentId = firstNonBlank(
                json.path("payment_id").asText(null),
                json.path("id").asText(null)
            );

            return new ProviderCheckoutSession(checkoutUrl, providerPaymentId, null);
        } catch (IOException | InterruptedException exception) {
            if (exception instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            LOGGER.error("dLocal booking checkout error bookingId={}", request.bookingId(), exception);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Error al crear checkout de reserva en dLocal");
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

            HttpRequest request = applySignedHeaders(
                HttpRequest.newBuilder(URI.create(endpoint)),
                config,
                requestDate,
                body
            )
                .timeout(Duration.ofMillis(config.getTimeoutMillis()))
                .header("Content-Type", "application/json")
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
            HttpRequest httpRequest = applySignedHeaders(
                HttpRequest.newBuilder(URI.create(endpoint)),
                config,
                requestDate,
                ""
            )
                .timeout(Duration.ofMillis(config.getTimeoutMillis()))
                .header("Content-Type", "application/json")
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

    @Override
    public ProviderRefundResult createRefund(ProviderRefundRequest request) {
        BillingProperties.DLocal config = billingProperties.getDlocal();
        if (!config.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "dLocal deshabilitado");
        }
        if (request.providerPaymentId() == null || request.providerPaymentId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "providerPaymentId es obligatorio para refund");
        }

        String endpoint = config.getBaseUrl() + config.getRefundPath().replace("{id}", request.providerPaymentId());
        HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofMillis(config.getTimeoutMillis()))
            .build();

        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("amount", request.amount());
            payload.put("currency", request.currency());
            payload.put("reason", request.reason());
            payload.put("external_id", request.refundReference());
            if (request.webhookUrl() != null && !request.webhookUrl().isBlank()) {
                payload.put("notification_url", request.webhookUrl());
            }
            String body = objectMapper.writeValueAsString(payload);
            String requestDate = DateTimeFormatter.ISO_INSTANT.format(Instant.now());

            HttpRequest httpRequest = applySignedHeaders(
                HttpRequest.newBuilder(URI.create(endpoint)),
                config,
                requestDate,
                body
            )
                .timeout(Duration.ofMillis(config.getTimeoutMillis()))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                LOGGER.warn("dLocal refund rejected status={} providerPaymentId={}", response.statusCode(), request.providerPaymentId());
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "No se pudo crear refund en dLocal");
            }

            JsonNode json = objectMapper.readTree(response.body());
            return new ProviderRefundResult(
                firstNonBlank(
                    json.path("refund_id").asText(null),
                    json.path("id").asText(null)
                ),
                request.providerPaymentId(),
                firstNonBlank(
                    json.path("status").asText(null),
                    json.path("refund_status").asText(null),
                    "pending"
                ),
                request.amount(),
                request.currency(),
                response.body()
            );
        } catch (IOException | InterruptedException exception) {
            if (exception instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            LOGGER.error("dLocal refund error providerPaymentId={}", request.providerPaymentId(), exception);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Error al crear refund en dLocal");
        }
    }

    @Override
    public ProviderPayoutResult createPayout(ProviderPayoutRequest request) {
        BillingProperties.DLocal config = billingProperties.getDlocal();
        if (!config.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "dLocal deshabilitado");
        }
        if (config.getPayoutClientId() == null || config.getPayoutClientId().isBlank()
            || config.getPayoutClientSecret() == null || config.getPayoutClientSecret().isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "dLocal payouts OAuth no configurado");
        }

        String endpoint = config.getBaseUrl() + config.getPayoutPath();
        HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofMillis(config.getTimeoutMillis()))
            .build();

        try {
            Map<String, Object> payload = buildPayoutPayload(request);
            String body = objectMapper.writeValueAsString(payload);
            HttpRequest httpRequest = HttpRequest.newBuilder(URI.create(endpoint))
                .timeout(Duration.ofMillis(config.getTimeoutMillis()))
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .header("Authorization", "Bearer " + getPayoutAccessToken(config, httpClient))
                .header("X-Version", "3.0")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                LOGGER.warn("dLocal payout rejected status={} payoutRecordId={}", response.statusCode(), request.payoutRecordId());
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "No se pudo iniciar payout en dLocal");
            }

            JsonNode json = objectMapper.readTree(response.body());
            return new ProviderPayoutResult(
                firstNonBlank(
                    json.path("id").asText(null),
                    json.path("payout_id").asText(null)
                ),
                firstNonBlank(json.path("status").asText(null), "PENDING"),
                parseDecimal(firstNonBlank(json.path("amount").asText(null), request.amount().toPlainString())),
                firstNonBlank(json.path("currency").asText(null), request.currency()),
                response.body()
            );
        } catch (IOException | InterruptedException exception) {
            if (exception instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            LOGGER.error("dLocal payout error payoutRecordId={}", request.payoutRecordId(), exception);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Error al iniciar payout de dLocal");
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

    private Map<String, Object> buildBookingCheckoutPayload(
        BookingProviderCheckoutRequest request,
        BillingProperties.DLocal config
    ) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("amount", request.amount());
        payload.put("currency", request.currency());
        payload.put("country", config.getCountry());
        payload.put("order_id", request.transactionId());
        payload.put("description", request.description());
        payload.put("external_id", "booking:" + request.bookingId());

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

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("bookingId", request.bookingId());
        metadata.put("professionalId", request.professionalId());
        payload.put("metadata", metadata);
        return payload;
    }

    private Map<String, Object> buildPayoutPayload(ProviderPayoutRequest request) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("external_id", "payout:" + request.payoutRecordId());
        payload.put("amount", request.amount());
        payload.put("currency", request.currency());
        payload.put("country", request.country());
        payload.put("purpose", request.reason() == null || request.reason().isBlank() ? "OTHER_SERVICES" : request.reason());
        if (request.webhookUrl() != null && !request.webhookUrl().isBlank()) {
            payload.put("notification_url", request.webhookUrl());
        }

        Map<String, Object> beneficiary = new HashMap<>();
        beneficiary.put("first_name", request.beneficiaryFirstName());
        beneficiary.put("last_name", request.beneficiaryLastName());
        Map<String, Object> document = new HashMap<>();
        document.put("type", request.beneficiaryDocumentType());
        document.put("id", request.beneficiaryDocumentNumber());
        beneficiary.put("document", document);
        payload.put("beneficiary", beneficiary);

        Map<String, Object> bankAccount = new HashMap<>();
        bankAccount.put("type", request.bankAccountType());
        bankAccount.put("code", request.bankCode());
        bankAccount.put("branch", request.bankBranch());
        bankAccount.put("number", request.bankAccountNumber());
        payload.put("bank_account", bankAccount);
        return payload;
    }

    private HttpRequest.Builder applySignedHeaders(
        HttpRequest.Builder builder,
        BillingProperties.DLocal config,
        String requestDate,
        String body
    ) {
        return builder
            .header("X-Login", config.getXLogin())
            .header("X-Trans-Key", config.getXTransKey())
            .header("X-Date", requestDate)
            .header("X-Version", DLOCAL_API_VERSION)
            .header("User-Agent", DLOCAL_USER_AGENT)
            .header("Authorization", buildAuthorizationHeader(config, requestDate, body));
    }

    private String buildAuthorizationHeader(
        BillingProperties.DLocal config,
        String requestDate,
        String body
    ) {
        String payload = (config.getXLogin() == null ? "" : config.getXLogin())
            + (requestDate == null ? "" : requestDate)
            + (body == null ? "" : body);
        String signature = SignatureUtils.hmacSha256Hex(config.getWebhookSecret(), payload);
        return "V2-HMAC-SHA256, Signature: " + signature;
    }

    private synchronized String getPayoutAccessToken(
        BillingProperties.DLocal config,
        HttpClient httpClient
    ) throws IOException, InterruptedException {
        if (payoutAccessToken != null && payoutAccessTokenExpiresAt != null
            && payoutAccessTokenExpiresAt.isAfter(Instant.now().plusSeconds(60))) {
            return payoutAccessToken;
        }

        String endpoint = config.getBaseUrl() + config.getPayoutOauthPath();
        String credentials = Base64.getEncoder().encodeToString(
            (config.getPayoutClientId() + ":" + config.getPayoutClientSecret()).getBytes(java.nio.charset.StandardCharsets.UTF_8)
        );
        HttpRequest request = HttpRequest.newBuilder(URI.create(endpoint))
            .timeout(Duration.ofMillis(config.getTimeoutMillis()))
            .header("Authorization", "Basic " + credentials)
            .header("Content-Type", "application/x-www-form-urlencoded")
            .POST(HttpRequest.BodyPublishers.ofString("grant_type=client_credentials"))
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            LOGGER.warn("dLocal payout oauth rejected status={}", response.statusCode());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "No se pudo autenticar payouts en dLocal");
        }

        JsonNode json = objectMapper.readTree(response.body());
        String accessToken = json.path("access_token").asText(null);
        if (accessToken == null || accessToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "dLocal payouts no devolvió access_token");
        }
        long expiresIn = json.path("expires_in").asLong(300L);
        payoutAccessToken = accessToken;
        payoutAccessTokenExpiresAt = Instant.now().plusSeconds(Math.max(60L, expiresIn));
        return payoutAccessToken;
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
