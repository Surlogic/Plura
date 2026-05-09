package com.plura.plurabackend.core.billing.webhooks;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * BillingWebhookController es un controlador REST del modulo billing / webhooks.
 * Responsabilidad: recibir requests HTTP, validar acceso basico y delegar la operacion al servicio de aplicacion o dominio.
 * Superficie HTTP: atiende rutas bajo /webhooks y deja la logica pesada en servicios.
 * Foco funcional: billing, webhooks.
 */
@RestController
@RequestMapping("/webhooks")
public class BillingWebhookController {

    private final BillingWebhookService billingWebhookService;
    private final BillingWebhookAsyncDispatcher billingWebhookAsyncDispatcher;

    public BillingWebhookController(
        BillingWebhookService billingWebhookService,
        BillingWebhookAsyncDispatcher billingWebhookAsyncDispatcher
    ) {
        this.billingWebhookService = billingWebhookService;
        this.billingWebhookAsyncDispatcher = billingWebhookAsyncDispatcher;
    }

    /**
     * Endpoint POST /mercadopago: Procesa Mercado Pago y coordina la respuesta del flujo.
     * Valida parametros/autorizacion de entrada y delega la logica de negocio al servicio correspondiente.
     */
    @PostMapping("/mercadopago")
    public ResponseEntity<Void> handleMercadoPago(
        HttpServletRequest request,
        @RequestBody(required = false) String payload
    ) {
        BillingWebhookService.PreparedWebhookDispatch dispatch = billingWebhookService.prepareMercadoPagoDispatch(
            request,
            payload
        );
        if (dispatch != null) {
            billingWebhookAsyncDispatcher.dispatch(dispatch);
        }
        return ResponseEntity.ok().build();
    }
}
