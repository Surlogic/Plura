package com.plura.plurabackend.billing.webhooks;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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

    @PostMapping("/dlocal")
    public ResponseEntity<Void> handleDlocal(
        HttpServletRequest request,
        @RequestBody(required = false) String payload
    ) {
        billingWebhookService.handleDLocal(request, payload);
        return ResponseEntity.ok().build();
    }
}
