package com.plura.plurabackend.core.billing.mercadopago;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.billing.BillingProperties;
import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * MercadoPagoClient es un cliente de integracion del modulo billing / Mercado Pago.
 * Responsabilidad: aislar llamadas y payloads de una API externa para no mezclar provider logic con dominio.
 * Colabora con: billingProperties, objectMapper, httpClient.
 * Foco funcional: Mercado Pago, clientes.
 */
@Component
public class MercadoPagoClient {

    private static final Logger LOGGER = LoggerFactory.getLogger(MercadoPagoClient.class);

    private final BillingProperties billingProperties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public MercadoPagoClient(
        BillingProperties billingProperties,
        ObjectMapper objectMapper
    ) {
        this.billingProperties = billingProperties;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofMillis(billingProperties.getMercadopago().getTimeoutMillis()))
            .build();
    }

    /**
     * Crea preapproval plan validando datos de entrada y persistiendo el resultado.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    public MercadoPagoPreapprovalPlan createPreapprovalPlan(CreatePreapprovalPlanRequest request) {
        JsonNode response = sendRequest(
            HttpMethod.POST,
            billingProperties.getMercadopago().getPreapprovalPlanPath(),
            request,
            "No se pudo crear preapproval_plan en Mercado Pago"
        );

        String planId = textValue(response, "id");
        if (planId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Mercado Pago no devolvio id de plan");
        }

        return new MercadoPagoPreapprovalPlan(
            planId,
            firstNonBlank(
                textValue(response, "sandbox_init_point"),
                textValue(response, "init_point")
            )
        );
    }

    /**
     * Crea preapproval validando datos de entrada y persistiendo el resultado.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    public MercadoPagoPreapproval createPreapproval(CreatePreapprovalRequest request) {
        JsonNode response = sendRequest(
            HttpMethod.POST,
            billingProperties.getMercadopago().getPreapprovalPath(),
            request,
            "No se pudo crear suscripcion en Mercado Pago"
        );
        return toPreapproval(response, true);
    }

    public MercadoPagoPreapproval getPreapproval(String preapprovalId) {
        JsonNode response = sendRequest(
            HttpMethod.GET,
            billingProperties.getMercadopago().getSubscriptionStatusPath().replace("{id}", preapprovalId),
            null,
            "No se pudo consultar la suscripcion en Mercado Pago"
        );
        return toPreapproval(response, false);
    }

    public Optional<MercadoPagoPreapproval> findPreapprovalByReference(
        String externalReference,
        String payerEmail,
        String preapprovalPlanId
    ) {
        String path = buildPreapprovalSearchPath(
            externalReference,
            externalReference == null || externalReference.isBlank() ? payerEmail : null,
            preapprovalPlanId
        );
        JsonNode response = sendSearchRequest(path);
        JsonNode results = response.path("results");
        Optional<MercadoPagoPreapproval> strictMatch =
            findStrictPreapprovalMatch(results, externalReference, payerEmail, preapprovalPlanId);
        if (strictMatch.isPresent()) {
            return strictMatch;
        }

        if ((payerEmail == null || payerEmail.isBlank()) && (preapprovalPlanId == null || preapprovalPlanId.isBlank())) {
            return Optional.empty();
        }

        JsonNode fallbackResults = sendSearchRequest(buildPreapprovalSearchPath(null, payerEmail, preapprovalPlanId))
            .path("results");
        strictMatch = findStrictPreapprovalMatch(fallbackResults, externalReference, payerEmail, preapprovalPlanId);
        return strictMatch.or(() -> findUniqueConfirmedEmailPlanMatch(fallbackResults, payerEmail, preapprovalPlanId));
    }

    private JsonNode sendSearchRequest(String path) {
        return sendRequest(
            HttpMethod.GET,
            path,
            null,
            "No se pudo buscar la suscripcion en Mercado Pago"
        );
    }

    private Optional<MercadoPagoPreapproval> findStrictPreapprovalMatch(
        JsonNode results,
        String externalReference,
        String payerEmail,
        String preapprovalPlanId
    ) {
        if (!results.isArray()) {
            return Optional.empty();
        }
        MercadoPagoPreapproval bestMatch = null;
        OffsetDateTime bestDate = null;
        for (JsonNode result : results) {
            if (!matchesPreapprovalSearchResult(result, externalReference, payerEmail, preapprovalPlanId)) {
                continue;
            }
            OffsetDateTime candidateDate = parseOffsetDateTime(firstNonBlank(
                textValue(result, "last_modified"),
                textValue(result, "date_created")
            ));
            if (bestMatch == null || isAfter(candidateDate, bestDate)) {
                bestMatch = toPreapproval(result, false);
                bestDate = candidateDate;
            }
        }
        return Optional.ofNullable(bestMatch);
    }

    private Optional<MercadoPagoPreapproval> findUniqueConfirmedEmailPlanMatch(
        JsonNode results,
        String payerEmail,
        String preapprovalPlanId
    ) {
        if (!results.isArray()) {
            return Optional.empty();
        }
        MercadoPagoPreapproval match = null;
        for (JsonNode result : results) {
            if (!matchesEmailAndPlan(result, payerEmail, preapprovalPlanId)
                || !isConfirmedPreapprovalStatus(textValue(result, "status"))) {
                continue;
            }
            if (match != null) {
                return Optional.empty();
            }
            match = toPreapproval(result, false);
        }
        return Optional.ofNullable(match);
    }

    /**
     * Actualiza preapproval estado manteniendo reglas de negocio y consistencia de datos.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    public MercadoPagoPreapproval updatePreapprovalStatus(String preapprovalId, String status) {
        JsonNode response = sendRequest(
            HttpMethod.PUT,
            billingProperties.getMercadopago().getCancelPath().replace("{id}", preapprovalId),
            new UpdatePreapprovalStatusRequest(status),
            "No se pudo actualizar la suscripcion en Mercado Pago"
        );
        return toPreapproval(response, false);
    }

    /**
     * Envia solicitud mediante el canal configurado.
     */
    private JsonNode sendRequest(
        HttpMethod method,
        String path,
        Object body,
        String failureMessage
    ) {
        BillingProperties.MercadoPago config = billingProperties.getMercadopago();
        if (!config.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Mercado Pago deshabilitado");
        }

        HttpRequest request = buildHttpRequest(method, config.getBaseUrl() + path, body, config);
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                String providerMessage = extractProviderMessage(response.body());
                LOGGER.warn(
                    "MercadoPago API rejected status={} path={} message={}",
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
            LOGGER.error("MercadoPago API error path={}", path, exception);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, failureMessage);
        }
    }

    /**
     * Construye http solicitud a partir de datos internos ya validados.
     */
    private HttpRequest buildHttpRequest(
        HttpMethod method,
        String endpoint,
        Object body,
        BillingProperties.MercadoPago config
    ) {
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(endpoint))
                .timeout(Duration.ofMillis(config.getTimeoutMillis()))
                .header("Authorization", "Bearer " + config.getSubscriptions().getAccessToken())
                .header("Content-Type", "application/json");

            if (method == HttpMethod.GET) {
                builder.GET();
            } else {
                builder.header("X-Idempotency-Key", UUID.randomUUID().toString());
                String payload = body == null ? "{}" : objectMapper.writeValueAsString(body);
                builder.method(method.name(), HttpRequest.BodyPublishers.ofString(payload));
            }

            return builder.build();
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "No se pudo serializar request a Mercado Pago");
        }
    }

    private String buildPreapprovalSearchPath(String externalReference, String payerEmail, String preapprovalPlanId) {
        StringBuilder path = new StringBuilder(billingProperties.getMercadopago().getPreapprovalSearchPath());
        boolean hasQuery = path.indexOf("?") >= 0;
        if (externalReference != null && !externalReference.isBlank()) {
            hasQuery = appendQueryParam(path, hasQuery, "q", externalReference);
        }
        if (payerEmail != null && !payerEmail.isBlank()) {
            hasQuery = appendQueryParam(path, hasQuery, "payer_email", payerEmail);
        }
        if (preapprovalPlanId != null && !preapprovalPlanId.isBlank()) {
            appendQueryParam(path, hasQuery, "preapproval_plan_id", preapprovalPlanId);
        }
        return path.toString();
    }

    private boolean appendQueryParam(StringBuilder path, boolean hasQuery, String name, String value) {
        path.append(hasQuery ? '&' : '?')
            .append(name)
            .append('=')
            .append(URLEncoder.encode(value.trim(), StandardCharsets.UTF_8));
        return true;
    }

    private boolean matchesPreapprovalSearchResult(
        JsonNode result,
        String externalReference,
        String payerEmail,
        String preapprovalPlanId
    ) {
        boolean referenceMatches = externalReference == null
            || externalReference.isBlank()
            || externalReference.equals(textValue(result, "external_reference"));
        boolean canIgnoreEmail = externalReference != null
            && !externalReference.isBlank()
            && externalReference.equals(textValue(result, "external_reference"));
        return referenceMatches && matchesEmailAndPlan(result, canIgnoreEmail ? null : payerEmail, preapprovalPlanId)
            && textValue(result, "id") != null;
    }

    private boolean matchesEmailAndPlan(
        JsonNode result,
        String payerEmail,
        String preapprovalPlanId
    ) {
        boolean emailMatches = payerEmail == null
            || payerEmail.isBlank()
            || payerEmail.equalsIgnoreCase(firstNonBlank(
                textValue(result, "payer_email"),
                textValue(result.at("/payer"), "email")
            ));
        boolean planMatches = preapprovalPlanId == null
            || preapprovalPlanId.isBlank()
            || preapprovalPlanId.equals(textValue(result, "preapproval_plan_id"));
        return emailMatches && planMatches && textValue(result, "id") != null;
    }

    private boolean isConfirmedPreapprovalStatus(String rawStatus) {
        if (rawStatus == null || rawStatus.isBlank()) {
            return false;
        }
        String status = rawStatus.trim().toLowerCase();
        return "authorized".equals(status)
            || "active".equals(status)
            || "trial".equals(status)
            || "trialing".equals(status);
    }

    private boolean isAfter(OffsetDateTime candidateDate, OffsetDateTime currentDate) {
        if (candidateDate == null) {
            return false;
        }
        return currentDate == null || candidateDate.isAfter(currentDate);
    }

    private OffsetDateTime parseOffsetDateTime(String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            return null;
        }
        try {
            return OffsetDateTime.parse(rawValue.trim());
        } catch (RuntimeException exception) {
            return null;
        }
    }

    /**
     * Convierte datos internos al formato preapproval esperado por el consumidor.
     */
    private MercadoPagoPreapproval toPreapproval(JsonNode response, boolean requireCheckoutUrl) {
        String preapprovalId = textValue(response, "id");
        if (preapprovalId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Mercado Pago no devolvio id de suscripcion");
        }

        String checkoutUrl = firstNonBlank(
            textValue(response, "sandbox_init_point"),
            textValue(response, "init_point")
        );
        if (requireCheckoutUrl && checkoutUrl == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Mercado Pago no devolvio init_point");
        }

        BigDecimal amount = decimalValue(firstNonBlank(
            textValue(response.at("/auto_recurring"), "transaction_amount"),
            textValue(response, "transaction_amount"),
            textValue(response, "amount")
        ));
        String currency = firstNonBlank(
            textValue(response.at("/auto_recurring"), "currency_id"),
            textValue(response, "currency_id"),
            textValue(response, "currency")
        );
        Long professionalId = longValue(firstNonBlank(
            textValue(response, "external_reference"),
            textValue(response, "external_id")
        ));

        return new MercadoPagoPreapproval(
            preapprovalId,
            checkoutUrl,
            textValue(response, "status"),
            amount,
            currency,
            professionalId,
            textValue(response, "payer_email"),
            textValue(response, "reason"),
            textValue(response, "preapproval_plan_id"),
            textValue(response, "external_reference")
        );
    }

    /**
     * Ejecuta la logica de text value manteniendola encapsulada en este componente.
     */
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

    /**
     * Obtiene el primer valor util de non blank ignorando nulos o blancos.
     */
    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    /**
     * Ejecuta la logica de decimal value manteniendola encapsulada en este componente.
     */
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

    /**
     * Extrae proveedor message desde una URL, payload o referencia persistida.
     */
    private String extractProviderMessage(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) {
            return null;
        }

        try {
            JsonNode root = objectMapper.readTree(responseBody);
            String message = firstNonBlank(
                textValue(root, "message"),
                textValue(root, "error"),
                textValue(root, "cause")
            );
            return message == null ? responseBody : message;
        } catch (IOException exception) {
            return responseBody;
        }
    }

    /**
     * Ejecuta la logica de long value manteniendola encapsulada en este componente.
     */
    private Long longValue(String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            return null;
        }
        String normalized = rawValue.trim();
        if (normalized.startsWith("subscription:")) {
            normalized = normalized.substring("subscription:".length()).trim();
        }
        try {
            return Long.valueOf(normalized);
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    /**
     * Crea preapproval plan solicitud validando datos de entrada y persistiendo el resultado.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record CreatePreapprovalPlanRequest(
        String reason,
        String back_url,
        AutoRecurring auto_recurring,
        String status,
        PaymentMethodsAllowed payment_methods_allowed
    ) {
        public CreatePreapprovalPlanRequest(String reason, String back_url, AutoRecurring auto_recurring, String status) {
            this(reason, back_url, auto_recurring, status, null);
        }
    }

    /**
     * Crea preapproval solicitud validando datos de entrada y persistiendo el resultado.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record CreatePreapprovalRequest(
        String preapproval_plan_id,
        String payer_email,
        String back_url,
        String status,
        String external_reference,
        String reason,
        String notification_url
    ) {
        public CreatePreapprovalRequest(
            String preapproval_plan_id,
            String payer_email,
            String back_url,
            String status,
            String external_reference,
            String reason
        ) {
            this(preapproval_plan_id, payer_email, back_url, status, external_reference, reason, null);
        }
    }

    /**
     * Actualiza preapproval estado solicitud manteniendo reglas de negocio y consistencia de datos.
     */
    public record UpdatePreapprovalStatusRequest(String status) {}

    /**
     * Bloque de datos auto recurring dentro de la respuesta principal.
     * Agrupa metricas relacionadas para que el frontend no tenga que reconstruirlas.
     */
    public record AutoRecurring(
        Integer frequency,
        String frequency_type,
        Number transaction_amount,
        String currency_id,
        FreeTrial free_trial
    ) {
        public AutoRecurring(
            Integer frequency,
            String frequency_type,
            Number transaction_amount,
            String currency_id
        ) {
            this(frequency, frequency_type, transaction_amount, currency_id, null);
        }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record FreeTrial(
        Integer frequency,
        String frequency_type
    ) {}

    /**
     * Ejecuta la logica de pago methods allowed manteniendola encapsulada en este componente.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record PaymentMethodsAllowed(
        java.util.List<String> payment_types,
        java.util.List<String> payment_methods
    ) {}

    /**
     * Bloque de datos mercado pago preapproval plan dentro de la respuesta principal.
     * Agrupa metricas relacionadas para que el frontend no tenga que reconstruirlas.
     */
    public record MercadoPagoPreapprovalPlan(
        String id,
        String checkoutUrl
    ) {}

    /**
     * Bloque de datos mercado pago preapproval dentro de la respuesta principal.
     * Agrupa metricas relacionadas para que el frontend no tenga que reconstruirlas.
     */
    public record MercadoPagoPreapproval(
        String id,
        String checkoutUrl,
        String status,
        BigDecimal amount,
        String currency,
        Long professionalId,
        String payerEmail,
        String reason,
        String preapprovalPlanId,
        String externalReference
    ) {}
}
