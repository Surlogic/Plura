package com.plura.plurabackend.professional.paymentprovider;

import com.plura.plurabackend.core.billing.BillingProperties;
import com.plura.plurabackend.core.billing.providerconnection.ProfessionalPaymentProviderConnectionService;
import com.plura.plurabackend.core.billing.providerconnection.mercadopago.MercadoPagoOAuthStateService;
import com.plura.plurabackend.core.security.RoleGuard;
import com.plura.plurabackend.professional.paymentprovider.dto.MercadoPagoOAuthStartResponse;
import com.plura.plurabackend.professional.paymentprovider.dto.ProfessionalPaymentProviderConnectionResponse;
import java.net.URI;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * ProfessionalMercadoPagoConnectionController es un controlador REST del modulo profesionales / proveedor de pago.
 * Responsabilidad: recibir requests HTTP, validar acceso basico y delegar la operacion al servicio de aplicacion o dominio.
 * Superficie HTTP: atiende rutas bajo /profesional/payment-providers/mercadopago y deja la logica pesada en servicios.
 * Foco funcional: profesionales, Mercado Pago.
 */
@RestController
@RequestMapping("/profesional/payment-providers/mercadopago")
public class ProfessionalMercadoPagoConnectionController {

    private static final Logger LOGGER = LoggerFactory.getLogger(ProfessionalMercadoPagoConnectionController.class);

    private final ProfessionalPaymentProviderConnectionService connectionService;
    private final MercadoPagoOAuthStateService mercadoPagoOAuthStateService;
    private final RoleGuard roleGuard;
    private final BillingProperties billingProperties;
    private final String publicWebUrl;

    public ProfessionalMercadoPagoConnectionController(
        ProfessionalPaymentProviderConnectionService connectionService,
        MercadoPagoOAuthStateService mercadoPagoOAuthStateService,
        RoleGuard roleGuard,
        BillingProperties billingProperties,
        @Value("${app.email.public-web-url:http://localhost:3002}") String publicWebUrl
    ) {
        this.connectionService = connectionService;
        this.mercadoPagoOAuthStateService = mercadoPagoOAuthStateService;
        this.roleGuard = roleGuard;
        this.billingProperties = billingProperties;
        this.publicWebUrl = publicWebUrl;
    }

    @GetMapping("/connection")
    public ProfessionalPaymentProviderConnectionResponse getConnection() {
        return connectionService.getMercadoPagoConnection(roleGuard.requireProfessional());
    }

    /**
     * Ejecuta la logica de inicio o autenticacion manteniendola encapsulada en este componente.
     */
    @PostMapping("/oauth/start")
    public MercadoPagoOAuthStartResponse startOAuth() {
        return connectionService.startMercadoPagoOAuth(roleGuard.requireProfessional());
    }

    /**
     * Endpoint GET /oauth/callback: Procesa o autenticacion callback y coordina la respuesta del flujo.
     * Valida parametros/autorizacion de entrada y delega la logica de negocio al servicio correspondiente.
     */
    @GetMapping("/oauth/callback")
    public ResponseEntity<Void> handleOAuthCallback(
        @RequestParam(value = "code", required = false) String code,
        @RequestParam(value = "state", required = false) String state,
        @RequestParam(value = "error", required = false) String error,
        @RequestParam(value = "error_description", required = false) String errorDescription
    ) {
        Long professionalId;
        try {
            professionalId = mercadoPagoOAuthStateService.resolveProfessionalId(state);
        } catch (ResponseStatusException exception) {
            LOGGER.warn(
                "Mercado Pago OAuth callback rejected before processing status={} reason={}",
                exception.getStatusCode().value(),
                safeForLogs(exception.getReason())
            );
            return redirectFrontend(resolveResult(error, exception), resolveReason(error, exception));
        }

        try {
            ProfessionalPaymentProviderConnectionResponse response =
                connectionService.handleMercadoPagoOAuthCallbackForProfessionalId(
                    professionalId,
                    code,
                    state,
                    error,
                    errorDescription
                );
            return redirectFrontend(
                response.connected() ? "connected" : "error",
                response.connected() ? "connected" : "not_connected"
            );
        } catch (ResponseStatusException exception) {
            LOGGER.warn(
                "Mercado Pago OAuth callback failed for redirect professionalId={} status={} reason={}",
                professionalId,
                exception.getStatusCode().value(),
                safeForLogs(exception.getReason())
            );
            return redirectFrontend(resolveResult(error, exception), resolveReason(error, exception));
        } catch (Exception exception) {
            LOGGER.error(
                "Mercado Pago OAuth callback crashed for redirect professionalId={}",
                professionalId,
                exception
            );
            return redirectFrontend("error", "oauth_failed");
        }
    }

    /**
     * Ejecuta la logica de disconnect manteniendola encapsulada en este componente.
     */
    @DeleteMapping("/connection")
    public ProfessionalPaymentProviderConnectionResponse disconnect() {
        return connectionService.disconnectMercadoPagoConnection(roleGuard.requireProfessional());
    }

    /**
     * Ejecuta la logica de redirect frontend manteniendola encapsulada en este componente.
     */
    private ResponseEntity<Void> redirectFrontend(String result, String reason) {
        URI redirectUri = UriComponentsBuilder.fromUriString(resolveFrontendRedirectUrl())
            .replaceQuery(null)
            .queryParam("result", result)
            .queryParam("reason", reason)
            .build(true)
            .toUri();
        return ResponseEntity.status(302)
            .header(HttpHeaders.LOCATION, redirectUri.toString())
            .build();
    }

    /**
     * Resuelve frontend redirect URL normalizando entradas, defaults y casos borde.
     */
    private String resolveFrontendRedirectUrl() {
        BillingProperties.MercadoPago.OAuth oauth = billingProperties.getMercadopago().getReservations().getOauth();
        String configured = oauth.getFrontendRedirectUrl();
        if (configured != null && !configured.isBlank()) {
            return configured.trim();
        }
        String normalizedPublicWebUrl = publicWebUrl == null ? "" : publicWebUrl.trim();
        if (normalizedPublicWebUrl.endsWith("/")) {
            normalizedPublicWebUrl = normalizedPublicWebUrl.substring(0, normalizedPublicWebUrl.length() - 1);
        }
        return normalizedPublicWebUrl + "/oauth/mercadopago/callback";
    }

    /**
     * Resuelve result normalizando entradas, defaults y casos borde.
     */
    private String resolveResult(String providerError, ResponseStatusException exception) {
        if (providerError != null && providerError.trim().equalsIgnoreCase("access_denied")) {
            return "cancelled";
        }
        return "error";
    }

    /**
     * Resuelve reason normalizando entradas, defaults y casos borde.
     */
    private String resolveReason(String providerError, ResponseStatusException exception) {
        if (providerError != null && providerError.trim().equalsIgnoreCase("access_denied")) {
            return "access_denied";
        }
        if (exception == null || exception.getReason() == null) {
            return "oauth_failed";
        }
        String normalized = exception.getReason().trim().toLowerCase();
        if (normalized.contains("client-id")
            || normalized.contains("client-secret")
            || normalized.contains("redirect-uri")
            || normalized.contains("authorization-url")
            || normalized.contains("token-url")) {
            return "configuration_error";
        }
        if (normalized.contains("state oauth")) {
            return "state_invalid";
        }
        if (normalized.contains("missing code") || normalized.contains("no devolvio code")) {
            return "missing_code";
        }
        if (normalized.contains("token exchange") || normalized.contains("invalid_grant")
            || normalized.contains("oauth con mercado pago")) {
            return "token_exchange_failed";
        }
        if (normalized.contains("code_verifier")) {
            return "token_exchange_failed";
        }
        if (normalized.contains("vinculada a otro profesional")) {
            return "oauth_failed";
        }
        if (normalized.contains("autorizacion oauth pendiente")) {
            return "state_invalid";
        }
        if (normalized.contains("solo profesionales") || normalized.contains("sin sesión")
            || normalized.contains("sin sesion") || normalized.contains("token inválido")
            || normalized.contains("token invalido")) {
            return "auth_required";
        }
        return "oauth_failed";
    }

    /**
     * Ejecuta for logs atrapando errores para que el flujo principal no falle innecesariamente.
     */
    private String safeForLogs(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.length() <= 24) {
            return trimmed;
        }
        return trimmed.substring(0, 12) + "..." + trimmed.substring(trimmed.length() - 6);
    }
}
