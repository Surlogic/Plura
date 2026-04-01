package com.plura.plurabackend.core.billing.payments.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.billing.BillingProperties;
import com.plura.plurabackend.core.billing.payments.model.PaymentProvider;
import com.plura.plurabackend.core.billing.providerconnection.ProfessionalPaymentProviderConnectionService;
import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class MercadoPagoReservationPaymentProviderClient implements PaymentProviderClient {

    private static final Logger LOGGER = LoggerFactory.getLogger(MercadoPagoReservationPaymentProviderClient.class);

    private final BillingProperties billingProperties;
    private final ProfessionalPaymentProviderConnectionService connectionService;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public MercadoPagoReservationPaymentProviderClient(
        BillingProperties billingProperties,
        ProfessionalPaymentProviderConnectionService connectionService,
        ObjectMapper objectMapper
    ) {
        this.billingProperties = billingProperties;
        this.connectionService = connectionService;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofMillis(billingProperties.getMercadopago().getTimeoutMillis()))
            .build();
    }

    @Override
    public PaymentProvider provider() {
        return PaymentProvider.MERCADOPAGO;
    }

    @Override
    public ProviderCheckoutSession createCheckout(ProviderCheckoutRequest request) {
        throw new UnsupportedOperationException("Checkout de suscripciones se maneja fuera del provider de reservas");
    }

    @Override
    public void cancelSubscription(String providerSubscriptionId, boolean immediate) {
        throw new UnsupportedOperationException("Las suscripciones se manejan fuera del provider de reservas");
    }

    @Override
    public ProviderCheckoutSession createBookingCheckout(BookingProviderCheckoutRequest request) {
        ProfessionalPaymentProviderConnectionService.MercadoPagoConnectionAccess access =
            connectionService.resolveMercadoPagoAccessForProfessional(request.professionalId());
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("items", java.util.List.of(Map.of(
            "id", "booking-" + request.bookingId(),
            "title", request.description(),
            "description", request.description(),
            "quantity", 1,
            "currency_id", normalizeCurrency(request.currency()),
            "unit_price", toNumber(request.amount())
        )));
        payload.put("external_reference", bookingExternalReference(request.bookingId()));
        payload.put("metadata", Map.of(
            "pluraDomain", "reservation",
            "bookingId", request.bookingId(),
            "professionalId", request.professionalId(),
            "transactionId", request.transactionId()
        ));
        payload.put("notification_url", request.webhookUrl());
        payload.put("back_urls", buildBackUrls());
        payload.put("auto_return", "approved");
        if (request.customerEmail() != null && !request.customerEmail().isBlank()) {
            payload.put("payer", Map.of("email", request.customerEmail().trim()));
        }

        JsonNode response = sendRequest(
            access.accessToken(),
            HttpMethod.POST,
            billingProperties.getMercadopago().getReservationPreferencePath(),
            null,
            payload,
            "No se pudo crear checkout de reserva en Mercado Pago"
        );
        String checkoutUrl = firstNonBlank(
            textValue(response, "init_point"),
            textValue(response, "sandbox_init_point")
        );
        if (checkoutUrl == null) {
            throw new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                "Mercado Pago no devolvio init_point para la reserva"
            );
        }
        return new ProviderCheckoutSession(
            checkoutUrl,
            textValue(response, "id"),
            access.providerUserId()
        );
    }

    @Override
    public ProviderVerificationResult verifyPayment(ProviderVerificationRequest request) {
        Long professionalId = request.expectedProfessionalId();
        if (professionalId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "professionalId esperado es obligatorio");
        }
        ProfessionalPaymentProviderConnectionService.MercadoPagoConnectionAccess access =
            connectionService.resolveMercadoPagoAccessForProfessional(professionalId);

        JsonNode payment = fetchPayment(access.accessToken(), request);
        if (payment == null || payment.isMissingNode() || payment.isNull()) {
            return new ProviderVerificationResult(
                false,
                "NOT_FOUND",
                request.expectedAmount(),
                normalizeCurrency(request.expectedCurrency()),
                professionalId,
                null,
                request.providerPaymentId()
            );
        }

        String status = safeUpper(textValue(payment, "status"));
        return new ProviderVerificationResult(
            isApprovedStatus(status),
            status,
            decimalValue(firstNonBlank(textValue(payment, "transaction_amount"), textValue(payment, "amount"))),
            normalizeCurrency(firstNonBlank(textValue(payment, "currency_id"), textValue(payment, "currency"))),
            parseLong(firstNonBlank(
                textValue(payment.at("/metadata"), "professionalId"),
                extractProfessionalId(textValue(payment, "external_reference"))
            )),
            null,
            textValue(payment, "id")
        );
    }

    @Override
    public ProviderRefundResult createRefund(ProviderRefundRequest request) {
        throwIfBlank(request.providerPaymentId(), "providerPaymentId es obligatorio para refund");
        Long professionalId = request.professionalId();
        JsonNode payment = sendPlatformRequest(
            professionalId,
            request.providerPaymentId(),
            HttpMethod.POST,
            billingProperties.getMercadopago().getReservationRefundPath().replace("{id}", request.providerPaymentId()),
            Map.of("amount", toNumber(request.amount())),
            "No se pudo iniciar refund en Mercado Pago"
        );
        String status = safeUpper(firstNonBlank(
            textValue(payment, "status"),
            textValue(payment, "state")
        ));
        return new ProviderRefundResult(
            textValue(payment, "id"),
            request.providerPaymentId(),
            status,
            decimalValue(firstNonBlank(textValue(payment, "amount"), textValue(payment, "transaction_amount"))),
            normalizeCurrency(firstNonBlank(textValue(payment, "currency_id"), textValue(payment, "currency"))),
            toJson(payment)
        );
    }

    private JsonNode fetchPayment(String accessToken, ProviderVerificationRequest request) {
        if (request.providerPaymentId() != null && !request.providerPaymentId().isBlank()) {
            return sendRequest(
                accessToken,
                HttpMethod.GET,
                billingProperties.getMercadopago().getReservationPaymentStatusPath().replace("{id}", request.providerPaymentId()),
                null,
                null,
                "No se pudo consultar el pago en Mercado Pago"
            );
        }
        if (request.externalReference() == null || request.externalReference().isBlank()) {
            return null;
        }
        JsonNode response = sendRequest(
            accessToken,
            HttpMethod.GET,
            billingProperties.getMercadopago().getReservationPaymentSearchPath(),
            Map.of(
                "external_reference", request.externalReference(),
                "sort", "date_created",
                "criteria", "desc",
                "limit", "1"
            ),
            null,
            "No se pudo buscar el pago en Mercado Pago"
        );
        JsonNode results = response.path("results");
        return results.isArray() && !results.isEmpty() ? results.get(0) : null;
    }

    private JsonNode sendPlatformRequest(
        Long professionalId,
        String providerPaymentId,
        HttpMethod method,
        String path,
        Object body,
        String failureMessage
    ) {
        if (professionalId == null) {
            JsonNode payment = sendRequest(
                billingProperties.getMercadopago().getReservations().getPlatformAccessToken(),
                HttpMethod.GET,
                billingProperties.getMercadopago().getReservationPaymentStatusPath().replace("{id}", providerPaymentId),
                null,
                null,
                "No se pudo consultar el pago original en Mercado Pago"
            );
            professionalId = parseLong(firstNonBlank(
                textValue(payment.at("/metadata"), "professionalId"),
                extractProfessionalId(textValue(payment, "external_reference"))
            ));
            if (professionalId == null) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Mercado Pago no devolvio professionalId para el pago original"
                );
            }
        }
        ProfessionalPaymentProviderConnectionService.MercadoPagoConnectionAccess access =
            connectionService.resolveMercadoPagoAccessForProfessional(professionalId);
        return sendRequest(access.accessToken(), method, path, null, body, failureMessage);
    }

    private JsonNode sendRequest(
        String accessToken,
        HttpMethod method,
        String path,
        Map<String, String> queryParams,
        Object body,
        String failureMessage
    ) {
        String endpoint = buildEndpoint(path, queryParams);
        HttpRequest request = buildRequest(accessToken, method, endpoint, body);
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                String providerMessage = extractProviderMessage(response.body());
                LOGGER.warn(
                    "Mercado Pago reservation API rejected status={} path={} message={}",
                    response.statusCode(),
                    path,
                    providerMessage
                );
                throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    providerMessage == null ? failureMessage : failureMessage + ": " + providerMessage
                );
            }
            return objectMapper.readTree(response.body());
        } catch (IOException | InterruptedException exception) {
            if (exception instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            LOGGER.error("Mercado Pago reservation API failed path={}", path, exception);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, failureMessage);
        }
    }

    private HttpRequest buildRequest(String accessToken, HttpMethod method, String endpoint, Object body) {
        if (accessToken == null || accessToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Falta access token de Mercado Pago");
        }
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(endpoint))
                .timeout(Duration.ofMillis(billingProperties.getMercadopago().getTimeoutMillis()))
                .header("Authorization", "Bearer " + accessToken)
                .header("Content-Type", "application/json");
            if (method == HttpMethod.GET) {
                builder.GET();
            } else {
                builder.header("X-Idempotency-Key", UUID.randomUUID().toString());
                builder.method(method.name(), HttpRequest.BodyPublishers.ofString(
                    body == null ? "{}" : objectMapper.writeValueAsString(body)
                ));
            }
            return builder.build();
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "No se pudo serializar request a Mercado Pago");
        }
    }

    private String buildEndpoint(String path, Map<String, String> queryParams) {
        StringBuilder endpoint = new StringBuilder(billingProperties.getMercadopago().getBaseUrl()).append(path);
        if (queryParams == null || queryParams.isEmpty()) {
            return endpoint.toString();
        }
        boolean first = true;
        for (Map.Entry<String, String> entry : queryParams.entrySet()) {
            if (entry.getValue() == null || entry.getValue().isBlank()) {
                continue;
            }
            endpoint.append(first ? '?' : '&');
            first = false;
            endpoint.append(URLEncoder.encode(entry.getKey(), StandardCharsets.UTF_8));
            endpoint.append('=');
            endpoint.append(URLEncoder.encode(entry.getValue(), StandardCharsets.UTF_8));
        }
        return endpoint.toString();
    }

    private Map<String, String> buildBackUrls() {
        Map<String, String> backUrls = new LinkedHashMap<>();
        putIfPresent(backUrls, "success", billingProperties.getMercadopago().getSuccessUrl());
        putIfPresent(backUrls, "failure", billingProperties.getMercadopago().getFailureUrl());
        putIfPresent(backUrls, "pending", billingProperties.getMercadopago().getPendingUrl());
        return backUrls;
    }

    private void putIfPresent(Map<String, String> target, String key, String value) {
        if (value != null && !value.isBlank()) {
            target.put(key, value.trim());
        }
    }

    private String bookingExternalReference(Long bookingId) {
        return "booking:" + bookingId;
    }

    private boolean isApprovedStatus(String status) {
        return "APPROVED".equals(status) || "AUTHORIZED".equals(status) || "ACREDITADO".equals(status);
    }

    private String normalizeCurrency(String currency) {
        return currency == null ? null : currency.trim().toUpperCase();
    }

    private Number toNumber(BigDecimal amount) {
        if (amount == null) {
            return BigDecimal.ZERO;
        }
        return amount.stripTrailingZeros().scale() <= 0 ? amount.longValue() : amount.doubleValue();
    }

    private BigDecimal decimalValue(String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(rawValue.trim());
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private String extractProviderMessage(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) {
            return null;
        }
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            return firstNonBlank(
                textValue(root, "message"),
                textValue(root, "error"),
                textValue(root, "cause"),
                textValue(root, "status")
            );
        } catch (IOException exception) {
            return responseBody;
        }
    }

    private String toJson(JsonNode jsonNode) {
        try {
            return objectMapper.writeValueAsString(jsonNode);
        } catch (IOException exception) {
            return "{\"serializationError\":true}";
        }
    }

    private String textValue(JsonNode node, String fieldName) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        JsonNode child = node.get(fieldName);
        if (child == null || child.isNull()) {
            return null;
        }
        String value = child.asText(null);
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
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

    private String extractProfessionalId(String externalReference) {
        if (externalReference == null || externalReference.isBlank()) {
            return null;
        }
        if (externalReference.startsWith("booking:")) {
            return null;
        }
        if (externalReference.startsWith("subscription:")) {
            return externalReference.substring("subscription:".length()).trim();
        }
        return externalReference.trim();
    }

    private String extractBookingId(String externalReference) {
        if (externalReference == null || externalReference.isBlank()) {
            return null;
        }
        if (externalReference.startsWith("booking:")) {
            return externalReference.substring("booking:".length()).trim();
        }
        return null;
    }

    private String safeUpper(String value) {
        return value == null ? null : value.trim().toUpperCase();
    }

    private void throwIfBlank(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
    }
}
