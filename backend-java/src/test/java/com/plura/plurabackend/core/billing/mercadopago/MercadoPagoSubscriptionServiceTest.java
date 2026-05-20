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
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
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
                "Plura PLAN_CORE",
                "plan-core",
                "subscription:30",
                null,
                null
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

    @Test
    void findsConfirmedPreapprovalByEmailPlanWhenReferenceWasNotPreserved() throws Exception {
        AtomicReference<String> firstQuery = new AtomicReference<>();
        AtomicReference<String> secondQuery = new AtomicReference<>();
        HttpServer server = startMercadoPagoStub(firstQuery, secondQuery);
        try {
            BillingProperties properties = new BillingProperties();
            properties.getMercadopago().setEnabled(true);
            properties.getMercadopago().setBaseUrl("http://localhost:" + server.getAddress().getPort());
            MercadoPagoClient client = new MercadoPagoClient(properties, new ObjectMapper());

            Optional<MercadoPagoClient.MercadoPagoPreapproval> found = client.findPreapprovalByReference(
                "professional-registration:missing-reference",
                "pro@test.com",
                "plan-core"
            );

            assertTrue(found.isPresent());
            assertEquals("preapproval-confirmed", found.get().id());
            assertTrue(firstQuery.get().contains("q=professional-registration%3Amissing-reference"));
            assertEquals("payer_email=pro%40test.com&preapproval_plan_id=plan-core", secondQuery.get());
        } finally {
            server.stop(0);
        }
    }

    @Test
    void findsPreapprovalByReferenceWhenPayerEmailChangedInMercadoPago() throws Exception {
        AtomicReference<String> firstQuery = new AtomicReference<>();
        HttpServer server = startMercadoPagoReferenceStub(firstQuery);
        try {
            BillingProperties properties = new BillingProperties();
            properties.getMercadopago().setEnabled(true);
            properties.getMercadopago().setBaseUrl("http://localhost:" + server.getAddress().getPort());
            MercadoPagoClient client = new MercadoPagoClient(properties, new ObjectMapper());

            Optional<MercadoPagoClient.MercadoPagoPreapproval> found = client.findPreapprovalByReference(
                "professional-registration:kept-reference",
                "wizard@test.com",
                "plan-core"
            );

            assertTrue(found.isPresent());
            assertEquals("preapproval-reference", found.get().id());
            assertEquals("mercadopago@test.com", found.get().payerEmail());
            assertTrue(firstQuery.get().contains("q=professional-registration%3Akept-reference"));
            assertTrue(firstQuery.get().contains("preapproval_plan_id=plan-core"));
            assertTrue(!firstQuery.get().contains("payer_email="));
        } finally {
            server.stop(0);
        }
    }

    @Test
    void findsRecentUniquePreapprovalByPlanWhenReferenceAndEmailWereNotPreserved() throws Exception {
        AtomicReference<String> firstQuery = new AtomicReference<>();
        AtomicReference<String> secondQuery = new AtomicReference<>();
        AtomicReference<String> thirdQuery = new AtomicReference<>();
        HttpServer server = startMercadoPagoPlanOnlyStub(firstQuery, secondQuery, thirdQuery);
        try {
            BillingProperties properties = new BillingProperties();
            properties.getMercadopago().setEnabled(true);
            properties.getMercadopago().setBaseUrl("http://localhost:" + server.getAddress().getPort());
            MercadoPagoClient client = new MercadoPagoClient(properties, new ObjectMapper());

            Optional<MercadoPagoClient.MercadoPagoPreapproval> found = client.findPreapprovalByReference(
                "professional-registration:missing-reference",
                "wizard@test.com",
                "plan-core",
                Instant.parse("2026-05-20T02:54:06Z")
            );

            assertTrue(found.isPresent());
            assertEquals("preapproval-plan-only", found.get().id());
            assertTrue(firstQuery.get().contains("q=professional-registration%3Amissing-reference"));
            assertTrue(secondQuery.get().contains("payer_email=wizard%40test.com"));
            assertEquals("preapproval_plan_id=plan-core", thirdQuery.get());
        } finally {
            server.stop(0);
        }
    }

    private HttpServer startMercadoPagoStub(
        AtomicReference<String> firstQuery,
        AtomicReference<String> secondQuery
    ) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/preapproval/search", exchange -> {
            String query = exchange.getRequestURI().getRawQuery();
            String response;
            if (firstQuery.get() == null) {
                firstQuery.set(query);
                response = "{\"paging\":{\"total\":0},\"results\":[]}";
            } else {
                secondQuery.set(query);
                response = """
                    {"paging":{"total":1},"results":[{"id":"preapproval-confirmed","preapproval_plan_id":"plan-core","payer_email":"pro@test.com","status":"authorized","external_reference":null,"auto_recurring":{"transaction_amount":"990","currency_id":"UYU"}}]}
                    """;
            }
            byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.close();
        });
        server.start();
        return server;
    }

    private HttpServer startMercadoPagoReferenceStub(
        AtomicReference<String> firstQuery
    ) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/preapproval/search", exchange -> {
            firstQuery.set(exchange.getRequestURI().getRawQuery());
            String response = """
                {"paging":{"total":1},"results":[{"id":"preapproval-reference","preapproval_plan_id":"plan-core","payer_email":"mercadopago@test.com","status":"authorized","external_reference":"professional-registration:kept-reference","auto_recurring":{"transaction_amount":"990","currency_id":"UYU"}}]}
                """;
            byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.close();
        });
        server.start();
        return server;
    }

    private HttpServer startMercadoPagoPlanOnlyStub(
        AtomicReference<String> firstQuery,
        AtomicReference<String> secondQuery,
        AtomicReference<String> thirdQuery
    ) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/preapproval/search", exchange -> {
            String query = exchange.getRequestURI().getRawQuery();
            String response;
            if (firstQuery.get() == null) {
                firstQuery.set(query);
                response = "{\"paging\":{\"total\":0},\"results\":[]}";
            } else if (secondQuery.get() == null) {
                secondQuery.set(query);
                response = "{\"paging\":{\"total\":0},\"results\":[]}";
            } else {
                thirdQuery.set(query);
                response = """
                    {"paging":{"total":1},"results":[{"id":"preapproval-plan-only","preapproval_plan_id":"plan-core","payer_email":"other@test.com","status":"authorized","external_reference":null,"date_created":"2026-05-20T02:55:10.000Z","auto_recurring":{"transaction_amount":"990","currency_id":"UYU"}}]}
                    """;
            }
            byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.close();
        });
        server.start();
        return server;
    }
}
