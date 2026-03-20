package com.plura.plurabackend.billing.providerconnection;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.billing.BillingProperties;
import com.plura.plurabackend.core.billing.providerconnection.mercadopago.MercadoPagoOAuthClient;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
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
    void shouldRequireClientSecretForAuthorizationCodeExchange() {
        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> client.exchangeAuthorizationCode("code-123")
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
}
