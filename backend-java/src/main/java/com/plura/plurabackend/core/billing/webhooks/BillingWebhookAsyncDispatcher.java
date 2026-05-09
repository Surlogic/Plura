package com.plura.plurabackend.core.billing.webhooks;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * BillingWebhookAsyncDispatcher es un despachador asincronico del modulo billing / webhooks.
 * Responsabilidad: encolar o disparar trabajo fuera del flujo principal del request.
 * Colabora con: billingWebhookService.
 * Foco funcional: billing, webhooks.
 */
@Service
public class BillingWebhookAsyncDispatcher {

    private final BillingWebhookService billingWebhookService;

    public BillingWebhookAsyncDispatcher(BillingWebhookService billingWebhookService) {
        this.billingWebhookService = billingWebhookService;
    }

    /**
     * Despacha dispatch fuera del flujo principal del request.
     */
    @Async("billingWebhookExecutor")
    public void dispatch(BillingWebhookService.PreparedWebhookDispatch dispatch) {
        billingWebhookService.processPreparedWebhook(dispatch);
    }
}
