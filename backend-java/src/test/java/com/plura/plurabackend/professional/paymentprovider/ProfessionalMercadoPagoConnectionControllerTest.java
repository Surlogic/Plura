package com.plura.plurabackend.professional.paymentprovider;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.core.billing.BillingProperties;
import com.plura.plurabackend.core.billing.providerconnection.ProfessionalPaymentProviderConnectionService;
import com.plura.plurabackend.core.security.RoleGuard;
import com.plura.plurabackend.professional.paymentprovider.dto.ProfessionalPaymentProviderConnectionResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

class ProfessionalMercadoPagoConnectionControllerTest {

    private final ProfessionalPaymentProviderConnectionService connectionService =
        mock(ProfessionalPaymentProviderConnectionService.class);
    private final RoleGuard roleGuard = mock(RoleGuard.class);
    private final BillingProperties billingProperties = new BillingProperties();

    @Test
    void shouldRedirectFrontendAfterSuccessfulCallback() {
        ProfessionalMercadoPagoConnectionController controller = controller("http://localhost:3002");
        when(roleGuard.requireProfessional()).thenReturn(20L);
        when(connectionService.handleMercadoPagoOAuthCallback(20L, "code-1", "state-1", null, null))
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

    @Test
    void shouldRedirectFrontendWhenSessionIsMissing() {
        ProfessionalMercadoPagoConnectionController controller = controller("http://localhost:3002");
        when(roleGuard.requireProfessional()).thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sin sesión activa"));

        ResponseEntity<Void> response = controller.handleOAuthCallback("code-1", "state-1", null, null);

        assertEquals(HttpStatus.FOUND, response.getStatusCode());
        assertEquals(
            "http://localhost:3002/oauth/mercadopago/callback?result=error&reason=auth_required",
            response.getHeaders().getFirst(HttpHeaders.LOCATION)
        );
    }

    @Test
    void shouldRedirectFrontendWhenAuthorizationIsCancelled() {
        ProfessionalMercadoPagoConnectionController controller = controller("http://localhost:3002");
        when(roleGuard.requireProfessional()).thenReturn(20L);
        when(connectionService.handleMercadoPagoOAuthCallback(20L, null, "state-1", "access_denied", "cancelled"))
            .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mercado Pago devolvio error OAuth: access_denied"));

        ResponseEntity<Void> response = controller.handleOAuthCallback(null, "state-1", "access_denied", "cancelled");

        assertEquals(HttpStatus.FOUND, response.getStatusCode());
        assertEquals(
            "http://localhost:3002/oauth/mercadopago/callback?result=cancelled&reason=access_denied",
            response.getHeaders().getFirst(HttpHeaders.LOCATION)
        );
    }

    @Test
    void shouldUseConfiguredFrontendRedirectUrlWhenPresent() {
        billingProperties.getMercadopago().getReservations().getOauth()
            .setFrontendRedirectUrl("https://plura-web.onrender.com/oauth/mercadopago/callback");
        ProfessionalMercadoPagoConnectionController controller = controller("http://localhost:3002");
        when(roleGuard.requireProfessional()).thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sin sesión activa"));

        ResponseEntity<Void> response = controller.handleOAuthCallback("code-1", "state-1", null, null);

        assertEquals(
            "https://plura-web.onrender.com/oauth/mercadopago/callback?result=error&reason=auth_required",
            response.getHeaders().getFirst(HttpHeaders.LOCATION)
        );
    }

    private ProfessionalMercadoPagoConnectionController controller(String publicWebUrl) {
        return new ProfessionalMercadoPagoConnectionController(
            connectionService,
            roleGuard,
            billingProperties,
            publicWebUrl
        );
    }
}
