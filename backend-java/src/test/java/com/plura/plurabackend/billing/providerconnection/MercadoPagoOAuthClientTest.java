package com.plura.plurabackend.billing.providerconnection;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.billing.BillingProperties;
import com.plura.plurabackend.core.billing.providerconnection.mercadopago.MercadoPagoOAuthClient;
import com.plura.plurabackend.core.billing.providerconnection.mercadopago.MercadoPagoOAuthStateService;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class MercadoPagoOAuthClientTest {

    private static final String EXPECTED_REDIRECT_URI =
        "http://localhost:3000/profesional/payment-providers/mercadopago/oauth/callback";

    private MercadoPagoOAuthClient client;

    @BeforeEach
    void setUp() {
        client = new MercadoPagoOAuthClient(configuredProperties(), new ObjectMapper());
    }

    @Test
    void shouldBuildAuthorizationUrlWithoutClientSecret() {
        String authorizationUrl = client.buildAuthorizationUrl("state-123");

        assertEquals(
            "https://auth.mercadopago.com/authorization?client_id=1234567890&response_type=code&platform_id=mp&state=state-123&redirect_uri="
                + EXPECTED_REDIRECT_URI,
            authorizationUrl
        );
    }

    @Test
    void shouldIncludeRedirectUriQueryParamInAuthorizationUrl() {
        String authorizationUrl = client.buildAuthorizationUrl("state-123");

        String redirectUri = parseQueryParams(authorizationUrl).get("redirect_uri");

        assertEquals(EXPECTED_REDIRECT_URI, redirectUri);
    }

    @Test
    void shouldAlwaysIncludeRedirectUriInAuthorizationUrlQueryString() {
        String authorizationUrl = client.buildAuthorizationUrl("state-123");

        assertTrue(
            parseQueryParams(authorizationUrl).containsKey("redirect_uri")
        );
    }

    @Test
    void shouldIncludePkceParamsInAuthorizationUrlWhenEnabled() {
        BillingProperties properties = configuredProperties();
        properties.getMercadopago().getReservations().getOauth().setPkceEnabled(true);
        MercadoPagoOAuthClient client = new MercadoPagoOAuthClient(properties, new ObjectMapper());

        String authorizationUrl = client.buildAuthorizationUrl(
            "state-123",
            new MercadoPagoOAuthStateService.PkceChallenge("verifier-1", "challenge-1", "S256")
        );

        Map<String, String> queryParams = parseQueryParams(authorizationUrl);
        assertEquals("challenge-1", queryParams.get("code_challenge"));
        assertEquals("S256", queryParams.get("code_challenge_method"));
    }

    @Test
    void shouldRequireClientSecretForAuthorizationCodeExchange() {
        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> client.exchangeAuthorizationCode("code-123", null)
        );

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, exception.getStatusCode());
        assertEquals("Falta configurar billing.mercadopago.reservations.oauth.client-secret", exception.getReason());
    }

    @Test
    void shouldRequireClientIdForAuthorizationUrl() {
        BillingProperties properties = configuredProperties();
        properties.getMercadopago().getReservations().getOauth().setClientId("");
        MercadoPagoOAuthClient client = new MercadoPagoOAuthClient(properties, new ObjectMapper());

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> client.buildAuthorizationUrl("state-123")
        );

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, exception.getStatusCode());
        assertEquals("Falta configurar billing.mercadopago.reservations.oauth.client-id", exception.getReason());
    }

    @Test
    void shouldRequireRedirectUriForAuthorizationUrl() {
        BillingProperties properties = configuredProperties();
        properties.getMercadopago().getReservations().getOauth().setRedirectUri("");
        MercadoPagoOAuthClient client = new MercadoPagoOAuthClient(properties, new ObjectMapper());

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> client.buildAuthorizationUrl("state-123")
        );

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, exception.getStatusCode());
        assertEquals("Falta configurar billing.mercadopago.reservations.oauth.redirect-uri", exception.getReason());
    }

    @Test
    void shouldRejectFrontendRedirectUriForAuthorizationUrl() {
        BillingProperties properties = configuredProperties();
        properties.getMercadopago().getReservations().getOauth().setRedirectUri("http://localhost:3002/oauth/mercadopago/callback");
        MercadoPagoOAuthClient client = new MercadoPagoOAuthClient(properties, new ObjectMapper());

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> client.buildAuthorizationUrl("state-123")
        );

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, exception.getStatusCode());
        assertEquals(
            "billing.mercadopago.reservations.oauth.redirect-uri debe apuntar al callback backend /profesional/payment-providers/mercadopago/oauth/callback",
            exception.getReason()
        );
    }

    @Test
    void shouldRequireCodeVerifierWhenPkceEnabled() {
        BillingProperties properties = configuredProperties();
        properties.getMercadopago().getReservations().getOauth().setPkceEnabled(true);
        properties.getMercadopago().getReservations().getOauth().setClientSecret("secret-1");
        MercadoPagoOAuthClient client = new MercadoPagoOAuthClient(properties, new ObjectMapper());

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> client.exchangeAuthorizationCode("code-123", null)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertEquals("code_verifier OAuth es obligatorio", exception.getReason());
    }

    @Test
    void shouldSendCodeVerifierInTokenExchangeWhenPkceEnabled() throws Exception {
        HttpServer server = HttpServer.create(new java.net.InetSocketAddress(0), 0);
        CaptureHandler handler = new CaptureHandler();
        server.createContext("/oauth/token", handler);
        server.start();
        try {
            BillingProperties properties = configuredProperties();
            properties.getMercadopago().getReservations().getOauth().setPkceEnabled(true);
            properties.getMercadopago().getReservations().getOauth().setClientSecret("secret-1");
            properties.getMercadopago().getReservations().getOauth()
                .setTokenUrl("http://localhost:" + server.getAddress().getPort() + "/oauth/token");
            MercadoPagoOAuthClient client = new MercadoPagoOAuthClient(properties, new ObjectMapper());

            MercadoPagoOAuthClient.TokenResponse tokenResponse =
                client.exchangeAuthorizationCode("code-123", "verifier-123");

            assertEquals("access-1", tokenResponse.accessToken());
            Map<String, String> formParams = parseForm(handler.requestBody);
            assertEquals("verifier-123", formParams.get("code_verifier"));
            assertEquals("code-123", formParams.get("code"));
            assertEquals(EXPECTED_REDIRECT_URI, formParams.get("redirect_uri"));
        } finally {
            server.stop(0);
        }
    }

    private BillingProperties configuredProperties() {
        BillingProperties properties = new BillingProperties();
        properties.setEnabled(true);

        BillingProperties.MercadoPago mercadoPago = properties.getMercadopago();
        mercadoPago.setEnabled(true);
        mercadoPago.getReservations().getOauth().setClientId("1234567890");
        mercadoPago.getReservations().getOauth().setRedirectUri(EXPECTED_REDIRECT_URI);
        mercadoPago.getReservations().getOauth().setAuthorizationUrl("https://auth.mercadopago.com/authorization");
        mercadoPago.getReservations().getOauth().setTokenUrl("https://api.mercadopago.com/oauth/token");

        return properties;
    }

    private Map<String, String> parseQueryParams(String authorizationUrl) {
        Map<String, String> queryParams = new LinkedHashMap<>();
        String rawQuery = URI.create(authorizationUrl).getRawQuery();
        if (rawQuery == null || rawQuery.isBlank()) {
            return queryParams;
        }
        for (String pair : rawQuery.split("&")) {
            if (pair == null || pair.isBlank()) {
                continue;
            }
            int separatorIndex = pair.indexOf('=');
            String rawKey = separatorIndex >= 0 ? pair.substring(0, separatorIndex) : pair;
            String rawValue = separatorIndex >= 0 ? pair.substring(separatorIndex + 1) : "";
            queryParams.put(
                URLDecoder.decode(rawKey, StandardCharsets.UTF_8),
                URLDecoder.decode(rawValue, StandardCharsets.UTF_8)
            );
        }
        return queryParams;
    }

    private Map<String, String> parseForm(String formBody) {
        Map<String, String> formParams = new LinkedHashMap<>();
        if (formBody == null || formBody.isBlank()) {
            return formParams;
        }
        for (String pair : formBody.split("&")) {
            if (pair == null || pair.isBlank()) {
                continue;
            }
            int separatorIndex = pair.indexOf('=');
            String rawKey = separatorIndex >= 0 ? pair.substring(0, separatorIndex) : pair;
            String rawValue = separatorIndex >= 0 ? pair.substring(separatorIndex + 1) : "";
            formParams.put(
                URLDecoder.decode(rawKey, StandardCharsets.UTF_8),
                URLDecoder.decode(rawValue, StandardCharsets.UTF_8)
            );
        }
        return formParams;
    }

    private static class CaptureHandler implements com.sun.net.httpserver.HttpHandler {
        private String requestBody;

        @Override
        public void handle(HttpExchange exchange) throws IOException {
            requestBody = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            JsonNode response = new ObjectMapper().createObjectNode()
                .put("access_token", "access-1")
                .put("refresh_token", "refresh-1")
                .put("user_id", 998877L)
                .put("scope", "offline_access")
                .put("expires_in", 3600)
                .put("token_type", "bearer")
                .put("public_key", "public-key");
            byte[] bytes = response.toString().getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.close();
        }
    }
}
