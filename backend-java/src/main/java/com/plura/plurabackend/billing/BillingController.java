package com.plura.plurabackend.billing;

import com.plura.plurabackend.billing.dto.BillingCancelRequest;
import com.plura.plurabackend.billing.dto.BillingCheckoutRequest;
import com.plura.plurabackend.billing.dto.BillingCheckoutResponse;
import com.plura.plurabackend.billing.dto.BillingSubscriptionResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/billing")
public class BillingController {

    private final BillingService billingService;

    public BillingController(BillingService billingService) {
        this.billingService = billingService;
    }

    @PostMapping("/checkout")
    public BillingCheckoutResponse createCheckout(
        @Valid @RequestBody BillingCheckoutRequest request
    ) {
        return billingService.createCheckout(request);
    }

    @GetMapping("/subscription")
    public BillingSubscriptionResponse getSubscription() {
        return billingService.getCurrentSubscription();
    }

    @PostMapping("/cancel")
    public BillingSubscriptionResponse cancelSubscription(
        @RequestBody(required = false) BillingCancelRequest request
    ) {
        return billingService.cancelSubscription(request == null ? new BillingCancelRequest() : request);
    }
}
