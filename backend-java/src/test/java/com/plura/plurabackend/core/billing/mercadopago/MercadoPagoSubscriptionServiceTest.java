package com.plura.plurabackend.core.billing.mercadopago;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.billing.BillingProperties;
import com.plura.plurabackend.core.billing.subscriptions.model.SubscriptionPlanCode;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class MercadoPagoSubscriptionServiceTest {

    @Test
    void serializesFreeTrialInsideAutoRecurring() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper();
        MercadoPagoClient.CreatePreapprovalPlanRequest request = new MercadoPagoClient.CreatePreapprovalPlanRequest(
            "Plura Core",
            "https://app.test/billing",
            new MercadoPagoClient.AutoRecurring(
                1,
                "months",
                990,
                "UYU",
                new MercadoPagoClient.FreeTrial(30, "days")
            ),
            "active"
        );

        JsonNode json = objectMapper.readTree(objectMapper.writeValueAsString(request));

        assertEquals(30, json.at("/auto_recurring/free_trial/frequency").asInt());
        assertEquals("days", json.at("/auto_recurring/free_trial/frequency_type").asText());
    }

    @Test
    void createsCorePreapprovalPlanWithThirtyDayFreeTrialWhenNoConfiguredPlanId() {
        BillingProperties properties = new BillingProperties();
        properties.setEnabled(true);
        properties.setWebhookBaseUrl("https://api.test");
        properties.getMercadopago().setEnabled(true);
        properties.getMercadopago().setSubscriptionBackUrl("https://app.test/billing");
        properties.getMercadopago().setBaseUrl("https://api.mercadopago.com");
        MercadoPagoClient client = mock(MercadoPagoClient.class);
        when(client.createPreapprovalPlan(any()))
            .thenReturn(new MercadoPagoClient.MercadoPagoPreapprovalPlan("plan-core", "https://checkout.plan"));
        when(client.createPreapproval(any()))
            .thenReturn(new MercadoPagoClient.MercadoPagoPreapproval(
                "preapproval-1",
                "https://checkout.subscription",
                "pending",
                new BigDecimal("990"),
                "UYU",
                30L,
                "pro@test.com",
                "Plura PLAN_CORE"
            ));
        MercadoPagoSubscriptionService service = new MercadoPagoSubscriptionService(properties, client);

        service.createSubscription(new MercadoPagoSubscriptionService.CreateSubscriptionCommand(
            "sub-local",
            30L,
            "pro@test.com",
            SubscriptionPlanCode.PLAN_CORE,
            new BigDecimal("990"),
            "UYU"
        ));

        ArgumentCaptor<MercadoPagoClient.CreatePreapprovalPlanRequest> captor =
            ArgumentCaptor.forClass(MercadoPagoClient.CreatePreapprovalPlanRequest.class);
        verify(client).createPreapprovalPlan(captor.capture());

        MercadoPagoClient.AutoRecurring autoRecurring = captor.getValue().auto_recurring();
        assertEquals(1, autoRecurring.frequency());
        assertEquals("months", autoRecurring.frequency_type());
        assertEquals("UYU", autoRecurring.currency_id());
        assertTrue(new BigDecimal(autoRecurring.transaction_amount().toString()).compareTo(new BigDecimal("990")) == 0);
        assertEquals(30, autoRecurring.free_trial().frequency());
        assertEquals("days", autoRecurring.free_trial().frequency_type());
    }

    @Test
    void returnsHostedCheckoutWhenMercadoPagoRequiresCardTokenBeforePreapprovalId() {
        BillingProperties properties = new BillingProperties();
        properties.setEnabled(true);
        properties.setWebhookBaseUrl("https://api.test");
        properties.getMercadopago().setEnabled(true);
        properties.getMercadopago().setSubscriptionBackUrl("https://app.test/billing");
        properties.getMercadopago().setBaseUrl("https://api.mercadopago.com");
        MercadoPagoClient client = mock(MercadoPagoClient.class);
        when(client.createPreapprovalPlan(any()))
            .thenReturn(new MercadoPagoClient.MercadoPagoPreapprovalPlan("plan-core", "https://checkout.plan/start"));
        when(client.createPreapproval(any()))
            .thenThrow(new ResponseStatusException(HttpStatus.BAD_GATEWAY, "card_token_id is required"));
        MercadoPagoSubscriptionService service = new MercadoPagoSubscriptionService(properties, client);

        MercadoPagoSubscriptionService.SubscriptionCheckoutSession session = service.createSubscription(
            new MercadoPagoSubscriptionService.CreateSubscriptionCommand(
                null,
                "professional-registration:abc",
                "professional-registration:abc",
                "pro@test.com",
                SubscriptionPlanCode.PLAN_CORE,
                new BigDecimal("990"),
                "UYU",
                "https://app.test/return"
            )
        );

        assertNull(session.providerSubscriptionId());
        assertEquals("plan-core", session.preapprovalPlanId());
        assertTrue(session.checkoutUrl().startsWith("https://checkout.plan/start?"));
        assertTrue(session.checkoutUrl().contains("external_reference=professional-registration%3Aabc"));
        assertTrue(session.checkoutUrl().contains("payer_email=pro%40test.com"));
    }
}
