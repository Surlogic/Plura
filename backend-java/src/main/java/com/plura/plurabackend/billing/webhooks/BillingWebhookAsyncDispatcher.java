package com.plura.plurabackend.billing.webhooks;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class BillingWebhookAsyncDispatcher {

    private final BillingWebhookService billingWebhookService;

    public BillingWebhookAsyncDispatcher(BillingWebhookService billingWebhookService) {
        this.billingWebhookService = billingWebhookService;
    }

    @Async("billingWebhookExecutor")
    public void dispatch(BillingWebhookService.PreparedWebhookDispatch dispatch) {
        billingWebhookService.processPreparedWebhook(dispatch);
    }
}
