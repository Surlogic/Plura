package com.plura.plurabackend.billing.providerconnection;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.billing.BillingProperties;
import com.plura.plurabackend.core.billing.providerconnection.mercadopago.MercadoPagoOAuthClient;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class MercadoPagoOAuthClientTest {

    @Test
    void shouldBuildAuthorizationUrlWithoutClientSecret() {
        MercadoPagoOAuthClient client = new MercadoPagoOAuthClient(configuredProperties(), new ObjectMapper());

        String authorizationUrl = client.buildAuthorizationUrl("state-123");

        assertEquals(
            "https://auth.mercadopago.com/authorization?client_id=1234567890&response_type=code&platform_id=mp&state=state-123&redirect_uri=http://localhost:3000/profesional/payment-providers/mercadopago/oauth/callback",
            authorizationUrl
        );
    }

    @Test
    void shouldRequireClientSecretForAuthorizationCodeExchange() {
        MercadoPagoOAuthClient client = new MercadoPagoOAuthClient(configuredProperties(), new ObjectMapper());

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> client.exchangeAuthorizationCode("code-123")
        );

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, exception.getStatusCode());
        assertEquals("Falta configurar billing.mercadopago.oauth.client-secret", exception.getReason());
    }

    @Test
    void shouldRequireClientIdForAuthorizationUrl() {
        BillingProperties properties = configuredProperties();
        properties.getMercadopago().getOauth().setClientId("");
        MercadoPagoOAuthClient client = new MercadoPagoOAuthClient(properties, new ObjectMapper());

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> client.buildAuthorizationUrl("state-123")
        );

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, exception.getStatusCode());
        assertEquals("Falta configurar billing.mercadopago.oauth.client-id", exception.getReason());
    }

    @Test
    void shouldRequireRedirectUriForAuthorizationUrl() {
        BillingProperties properties = configuredProperties();
        properties.getMercadopago().getOauth().setRedirectUri("");
        MercadoPagoOAuthClient client = new MercadoPagoOAuthClient(properties, new ObjectMapper());

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> client.buildAuthorizationUrl("state-123")
        );

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, exception.getStatusCode());
        assertEquals("Falta configurar billing.mercadopago.oauth.redirect-uri", exception.getReason());
    }

    @Test
    void shouldRejectFrontendRedirectUriForAuthorizationUrl() {
        BillingProperties properties = configuredProperties();
        properties.getMercadopago().getOauth().setRedirectUri("http://localhost:3002/oauth/mercadopago/callback");
        MercadoPagoOAuthClient client = new MercadoPagoOAuthClient(properties, new ObjectMapper());

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> client.buildAuthorizationUrl("state-123")
        );

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, exception.getStatusCode());
        assertEquals(
            "billing.mercadopago.oauth.redirect-uri debe apuntar al callback backend /profesional/payment-providers/mercadopago/oauth/callback",
            exception.getReason()
        );
    }

    private BillingProperties configuredProperties() {
        BillingProperties properties = new BillingProperties();
        properties.setEnabled(true);

        BillingProperties.MercadoPago mercadoPago = properties.getMercadopago();
        mercadoPago.setEnabled(true);
        mercadoPago.getOauth().setClientId("1234567890");
        mercadoPago.getOauth().setRedirectUri("http://localhost:3000/profesional/payment-providers/mercadopago/oauth/callback");
        mercadoPago.getOauth().setAuthorizationUrl("https://auth.mercadopago.com/authorization");
        mercadoPago.getOauth().setTokenUrl("https://api.mercadopago.com/oauth/token");

        return properties;
    }
}
