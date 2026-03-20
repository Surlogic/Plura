package com.plura.plurabackend.billing.providerconnection;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.plura.plurabackend.core.billing.BillingProperties;
import com.plura.plurabackend.core.billing.providerconnection.mercadopago.MercadoPagoOAuthStateService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class MercadoPagoOAuthStateServiceTest {

    @Test
    void shouldGeneratePkceChallengeWhenEnabled() {
        BillingProperties properties = configuredProperties(true);
        MercadoPagoOAuthStateService service = new MercadoPagoOAuthStateService(properties);

        MercadoPagoOAuthStateService.GeneratedState generatedState = service.generateState(30L);

        assertNotNull(generatedState.pkceChallenge());
        assertNotNull(generatedState.pkceChallenge().codeVerifier());
        assertNotNull(generatedState.pkceChallenge().codeChallenge());
        assertEquals("S256", generatedState.pkceChallenge().codeChallengeMethod());
        assertTrue(generatedState.pkceChallenge().codeVerifier().length() >= 43);
    }

    @Test
    void shouldSkipPkceChallengeWhenDisabled() {
        BillingProperties properties = configuredProperties(false);
        MercadoPagoOAuthStateService service = new MercadoPagoOAuthStateService(properties);

        MercadoPagoOAuthStateService.GeneratedState generatedState = service.generateState(30L);

        assertNull(generatedState.pkceChallenge());
    }

    @Test
    void shouldResolveProfessionalIdFromValidState() {
        BillingProperties properties = configuredProperties(false);
        MercadoPagoOAuthStateService service = new MercadoPagoOAuthStateService(properties);

        MercadoPagoOAuthStateService.GeneratedState generatedState = service.generateState(30L);

        assertEquals(30L, service.resolveProfessionalId(generatedState.value()));
    }

    @Test
    void shouldRejectInvalidState() {
        BillingProperties properties = configuredProperties(false);
        MercadoPagoOAuthStateService service = new MercadoPagoOAuthStateService(properties);

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> service.validateState("bad-state", 30L)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertEquals("state OAuth invalido", exception.getReason());
    }

    private BillingProperties configuredProperties(boolean pkceEnabled) {
        BillingProperties properties = new BillingProperties();
        properties.getMercadopago().getReservations().getOauth().setPkceEnabled(pkceEnabled);
        properties.getMercadopago().getReservations().getOauth().setStateSigningSecret("state-secret");
        return properties;
    }
}
