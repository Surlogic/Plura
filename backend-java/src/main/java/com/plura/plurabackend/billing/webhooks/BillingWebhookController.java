package com.plura.plurabackend.billing.webhooks;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/webhooks")
public class BillingWebhookController {

    private final BillingWebhookService billingWebhookService;

    public BillingWebhookController(BillingWebhookService billingWebhookService) {
        this.billingWebhookService = billingWebhookService;
    }

    @PostMapping("/mercadopago")
    public ResponseEntity<Map<String, String>> handleMercadoPago(
        HttpServletRequest request,
        @RequestBody(required = false) String payload
    ) {
        WebhookHandleResult result = billingWebhookService.handleMercadoPago(request, payload);
        return ResponseEntity.ok(Map.of("status", result.name()));
    }

    @PostMapping("/dlocal")
    public ResponseEntity<Map<String, String>> handleDlocal(
        HttpServletRequest request,
        @RequestBody(required = false) String payload
    ) {
        WebhookHandleResult result = billingWebhookService.handleDLocal(request, payload);
        return ResponseEntity.ok(Map.of("status", result.name()));
    }
}
