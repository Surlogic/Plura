package com.plura.plurabackend.core.billing.providerconnection.mercadopago;

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
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class MercadoPagoOAuthClient {

    private static final Logger LOGGER = LoggerFactory.getLogger(MercadoPagoOAuthClient.class);

    private final BillingProperties billingProperties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public MercadoPagoOAuthClient(
        BillingProperties billingProperties,
        ObjectMapper objectMapper
    ) {
        this.billingProperties = billingProperties;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofMillis(billingProperties.getMercadopago().getTimeoutMillis()))
            .build();
    }

    public String buildAuthorizationUrl(String state) {
        BillingProperties.MercadoPago.OAuth oauth = requireConfiguredAuthorization();
        return UriComponentsBuilder.fromUriString(oauth.getAuthorizationUrl())
            .queryParam("client_id", oauth.getClientId())
            .queryParam("response_type", "code")
            .queryParam("platform_id", "mp")
            .queryParam("state", state)
            .queryParam("redirect_uri", oauth.getRedirectUri())
            .build(true)
            .toUriString();
    }

    public TokenResponse exchangeAuthorizationCode(String code) {
        if (code == null || code.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "code OAuth es obligatorio");
        }
        BillingProperties.MercadoPago.OAuth oauth = requireConfiguredTokenExchange();
        return exchangeToken(formEncode(Map.of(
            "client_id", oauth.getClientId(),
            "client_secret", oauth.getClientSecret(),
            "grant_type", "authorization_code",
            "code", code.trim(),
            "redirect_uri", oauth.getRedirectUri()
        )));
    }

    public TokenResponse refreshAccessToken(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "refresh_token OAuth es obligatorio");
        }
        BillingProperties.MercadoPago.OAuth oauth = requireConfiguredTokenExchange();
        return exchangeToken(formEncode(Map.of(
            "client_id", oauth.getClientId(),
            "client_secret", oauth.getClientSecret(),
            "grant_type", "refresh_token",
            "refresh_token", refreshToken.trim()
        )));
    }

    private TokenResponse exchangeToken(String body) {
        BillingProperties.MercadoPago.OAuth oauth = requireConfiguredTokenExchange();

        HttpRequest request = HttpRequest.newBuilder(URI.create(oauth.getTokenUrl()))
            .timeout(Duration.ofMillis(billingProperties.getMercadopago().getTimeoutMillis()))
            .header("Content-Type", "application/x-www-form-urlencoded")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                String providerMessage = extractProviderMessage(response.body());
                LOGGER.warn(
                    "Mercado Pago OAuth token rejected status={} message={}",
                    response.statusCode(),
                    providerMessage
                );
                throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    providerMessage == null
                        ? "No se pudo completar OAuth con Mercado Pago"
                        : "No se pudo completar OAuth con Mercado Pago: " + providerMessage
                );
            }
            JsonNode root = objectMapper.readTree(response.body());
            String accessToken = textValue(root, "access_token");
            if (accessToken == null || accessToken.isBlank()) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Mercado Pago OAuth no devolvio access_token"
                );
            }
            String refreshToken = textValue(root, "refresh_token");
            String scope = textValue(root, "scope");
            Long userId = longValue(
                firstNonBlank(
                    textValue(root, "user_id"),
                    textValue(root, "payer_id"),
                    textValue(root, "collector_id")
                )
            );
            String publicKey = textValue(root, "public_key");
            String tokenType = textValue(root, "token_type");
            BigDecimal expiresIn = decimalValue(textValue(root, "expires_in"));
            LocalDateTime expiresAt = expiresIn == null
                ? null
                : LocalDateTime.now().plusSeconds(expiresIn.longValue());

            return new TokenResponse(
                accessToken,
                refreshToken,
                userId,
                scope,
                expiresAt,
                tokenType,
                publicKey,
                response.body()
            );
        } catch (IOException | InterruptedException exception) {
            if (exception instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            LOGGER.error("Mercado Pago OAuth token exchange failed", exception);
            throw new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                "No se pudo completar OAuth con Mercado Pago"
            );
        }
    }

    private BillingProperties.MercadoPago.OAuth requireConfiguredAuthorization() {
        if (!billingProperties.isEnabled() || !billingProperties.getMercadopago().isEnabled()) {
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Mercado Pago no esta habilitado"
            );
        }
        BillingProperties.MercadoPago.OAuth oauth = billingProperties.getMercadopago().getOauth();
        requirePresent(oauth.getClientId(), "billing.mercadopago.oauth.client-id");
        requirePresent(oauth.getRedirectUri(), "billing.mercadopago.oauth.redirect-uri");
        requirePresent(oauth.getAuthorizationUrl(), "billing.mercadopago.oauth.authorization-url");
        return oauth;
    }

    private BillingProperties.MercadoPago.OAuth requireConfiguredTokenExchange() {
        BillingProperties.MercadoPago.OAuth oauth = requireConfiguredAuthorization();
        requirePresent(oauth.getClientSecret(), "billing.mercadopago.oauth.client-secret");
        requirePresent(oauth.getTokenUrl(), "billing.mercadopago.oauth.token-url");
        return oauth;
    }

    private void requirePresent(String value, String configKey) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Falta configurar " + configKey
            );
        }
    }

    private String formEncode(Map<String, String> payload) {
        Map<String, String> orderedPayload = new LinkedHashMap<>(payload);
        StringBuilder builder = new StringBuilder();
        for (Map.Entry<String, String> entry : orderedPayload.entrySet()) {
            if (builder.length() > 0) {
                builder.append('&');
            }
            builder.append(URLEncoder.encode(entry.getKey(), StandardCharsets.UTF_8));
            builder.append('=');
            builder.append(URLEncoder.encode(entry.getValue(), StandardCharsets.UTF_8));
        }
        return builder.toString();
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
                textValue(root, "error_description"),
                textValue(root, "cause")
            );
        } catch (IOException exception) {
            return responseBody;
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

    private Long longValue(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Long.valueOf(value.trim());
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private BigDecimal decimalValue(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(value.trim());
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    public record TokenResponse(
        String accessToken,
        String refreshToken,
        Long userId,
        String scope,
        LocalDateTime expiresAt,
        String tokenType,
        String publicKey,
        String rawResponseJson
    ) {}
}
