package com.plura.plurabackend.professional.paymentprovider;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.core.billing.BillingProperties;
import com.plura.plurabackend.core.billing.providerconnection.ProfessionalPaymentProviderConnectionService;
import com.plura.plurabackend.core.billing.providerconnection.mercadopago.MercadoPagoOAuthStateService;
import com.plura.plurabackend.core.security.RoleGuard;
import com.plura.plurabackend.professional.paymentprovider.dto.ProfessionalPaymentProviderConnectionResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

/**
 * Tests de funciones del profesional / proveedor de pago del profesional.
 * Cubren escenarios de profesional Mercado Pago conexion controller para documentar el comportamiento esperado y evitar regresiones.
 * Mantener estos casos alineados con los contratos reales del backend cuando cambie la logica productiva.
 */
class ProfessionalMercadoPagoConnectionControllerTest {

    private final ProfessionalPaymentProviderConnectionService connectionService =
        mock(ProfessionalPaymentProviderConnectionService.class);
    private final MercadoPagoOAuthStateService mercadoPagoOAuthStateService =
        mock(MercadoPagoOAuthStateService.class);
    private final RoleGuard roleGuard = mock(RoleGuard.class);
    private final BillingProperties billingProperties = new BillingProperties();

    /**
     * Escenario: debe redirect frontend after exitoso callback.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void shouldRedirectFrontendAfterSuccessfulCallback() {
        ProfessionalMercadoPagoConnectionController controller = controller("http://localhost:3002");
        when(mercadoPagoOAuthStateService.resolveProfessionalId("state-1")).thenReturn(30L);
        when(connectionService.handleMercadoPagoOAuthCallbackForProfessionalId(30L, "code-1", "state-1", null, null))
            .thenReturn(new ProfessionalPaymentProviderConnectionResponse(
                "MERCADOPAGO",
                "CONNECTED",
                true,
                "998877",
                "998877",
                "offline_access",
                null,
                null,
                null,
                null,
                null
            ));

        ResponseEntity<Void> response = controller.handleOAuthCallback("code-1", "state-1", null, null);

        assertEquals(HttpStatus.FOUND, response.getStatusCode());
        assertEquals(
            "http://localhost:3002/oauth/mercadopago/callback?result=connected&reason=connected",
            response.getHeaders().getFirst(HttpHeaders.LOCATION)
        );
    }

    /**
     * Escenario: debe redirect frontend cuando sesion is faltante.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void shouldRedirectFrontendWhenSessionIsMissing() {
        ProfessionalMercadoPagoConnectionController controller = controller("http://localhost:3002");
        when(mercadoPagoOAuthStateService.resolveProfessionalId("state-1"))
            .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "state OAuth invalido"));

        ResponseEntity<Void> response = controller.handleOAuthCallback("code-1", "state-1", null, null);

        assertEquals(HttpStatus.FOUND, response.getStatusCode());
        assertEquals(
            "http://localhost:3002/oauth/mercadopago/callback?result=error&reason=state_invalid",
            response.getHeaders().getFirst(HttpHeaders.LOCATION)
        );
    }

    /**
     * Escenario: debe redirect frontend cuando authorization is cancelado.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void shouldRedirectFrontendWhenAuthorizationIsCancelled() {
        ProfessionalMercadoPagoConnectionController controller = controller("http://localhost:3002");
        when(mercadoPagoOAuthStateService.resolveProfessionalId("state-1")).thenReturn(30L);
        when(connectionService.handleMercadoPagoOAuthCallbackForProfessionalId(30L, null, "state-1", "access_denied", "cancelled"))
            .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mercado Pago devolvio error OAuth: access_denied"));

        ResponseEntity<Void> response = controller.handleOAuthCallback(null, "state-1", "access_denied", "cancelled");

        assertEquals(HttpStatus.FOUND, response.getStatusCode());
        assertEquals(
            "http://localhost:3002/oauth/mercadopago/callback?result=cancelled&reason=access_denied",
            response.getHeaders().getFirst(HttpHeaders.LOCATION)
        );
    }

    /**
     * Escenario: debe use configured frontend redirect url cuando present.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void shouldUseConfiguredFrontendRedirectUrlWhenPresent() {
        billingProperties.getMercadopago().getReservations().getOauth()
            .setFrontendRedirectUrl("https://plura-web-a6ka.vercel.app/oauth/mercadopago/callback");
        ProfessionalMercadoPagoConnectionController controller = controller("http://localhost:3002");
        when(mercadoPagoOAuthStateService.resolveProfessionalId("state-1"))
            .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "state OAuth invalido"));

        ResponseEntity<Void> response = controller.handleOAuthCallback("code-1", "state-1", null, null);

        assertEquals(
            "https://plura-web-a6ka.vercel.app/oauth/mercadopago/callback?result=error&reason=state_invalid",
            response.getHeaders().getFirst(HttpHeaders.LOCATION)
        );
    }

    /**
     * Escenario: debe redirect frontend cuando callback crashes unexpectedly.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void shouldRedirectFrontendWhenCallbackCrashesUnexpectedly() {
        ProfessionalMercadoPagoConnectionController controller = controller("http://localhost:3002");
        when(mercadoPagoOAuthStateService.resolveProfessionalId("state-1")).thenReturn(30L);
        when(connectionService.handleMercadoPagoOAuthCallbackForProfessionalId(30L, "code-1", "state-1", null, null))
            .thenThrow(new IllegalStateException("boom"));

        ResponseEntity<Void> response = controller.handleOAuthCallback("code-1", "state-1", null, null);

        assertEquals(HttpStatus.FOUND, response.getStatusCode());
        assertEquals(
            "http://localhost:3002/oauth/mercadopago/callback?result=error&reason=oauth_failed",
            response.getHeaders().getFirst(HttpHeaders.LOCATION)
        );
    }

    private ProfessionalMercadoPagoConnectionController controller(String publicWebUrl) {
        return new ProfessionalMercadoPagoConnectionController(
            connectionService,
            mercadoPagoOAuthStateService,
            roleGuard,
            billingProperties,
            publicWebUrl
        );
    }
}
