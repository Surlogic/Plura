package com.plura.plurabackend.billing.webhooks;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.plura.plurabackend.billing.payments.model.PaymentProvider;
import com.plura.plurabackend.billing.payments.repository.PaymentEventRepository;
import com.plura.plurabackend.billing.payments.repository.PaymentTransactionRepository;
import com.plura.plurabackend.billing.subscriptions.model.Subscription;
import com.plura.plurabackend.billing.subscriptions.model.SubscriptionPlan;
import com.plura.plurabackend.billing.subscriptions.model.SubscriptionStatus;
import com.plura.plurabackend.billing.subscriptions.repository.SubscriptionRepository;
import com.plura.plurabackend.billing.webhooks.signature.SignatureUtils;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import com.plura.plurabackend.user.model.User;
import com.plura.plurabackend.user.model.UserRole;
import com.plura.plurabackend.user.repository.UserRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
    "SPRING_DATASOURCE_URL=jdbc:h2:mem:billing-idempotency;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "SPRING_DATASOURCE_USERNAME=sa",
    "SPRING_DATASOURCE_PASSWORD=",
    "SPRING_JPA_DDL_AUTO=create-drop",
    "JWT_SECRET=test-secret-for-context-load",
    "JWT_REFRESH_PEPPER=test-refresh-pepper",
    "APP_TIMEZONE=America/Montevideo",
    "CACHE_ENABLED=false",
    "HIKARI_CONNECTION_INIT_SQL=SELECT 1",
    "SWAGGER_ENABLED=false",
    "BILLING_ENABLED=true",
    "BILLING_MODE=sandbox",
    "BILLING_PROVIDER_VERIFICATION_ENABLED=false",
    "BILLING_WEBHOOK_BASE_URL=http://localhost:3000",
    "BILLING_PLAN_BASIC_PRICE=990",
    "BILLING_PLAN_BASIC_CURRENCY=UYU",
    "BILLING_PLAN_PRO_PRICE=1990",
    "BILLING_PLAN_PRO_CURRENCY=UYU",
    "BILLING_PLAN_PREMIUM_PRICE=2990",
    "BILLING_PLAN_PREMIUM_CURRENCY=UYU",
    "BILLING_MERCADOPAGO_ENABLED=true",
    "BILLING_MERCADOPAGO_ACCESS_TOKEN=mp-test-token",
    "BILLING_MERCADOPAGO_WEBHOOK_SECRET=mp-webhook-secret",
    "BILLING_DLOCAL_ENABLED=false"
})
@AutoConfigureMockMvc
class BillingWebhookIdempotencyIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProfessionalProfileRepository professionalProfileRepository;

    @Autowired
    private SubscriptionRepository subscriptionRepository;

    @Autowired
    private PaymentEventRepository paymentEventRepository;

    @Autowired
    private PaymentTransactionRepository paymentTransactionRepository;

    private ProfessionalProfile professional;

    @BeforeEach
    void setUp() {
        paymentTransactionRepository.deleteAll();
        paymentEventRepository.deleteAll();
        subscriptionRepository.deleteAll();
        professionalProfileRepository.deleteAll();
        userRepository.deleteAll();

        User user = new User();
        user.setFullName("Pro Uno");
        user.setEmail("pro-uno@test.com");
        user.setPhoneNumber("099111222");
        user.setPassword("hashed");
        user.setRole(UserRole.PROFESSIONAL);
        user = userRepository.save(user);

        professional = new ProfessionalProfile();
        professional.setUser(user);
        professional.setRubro("Cabello");
        professional.setDisplayName("Pro Uno");
        professional.setSlug("pro-uno");
        professional.setActive(true);
        professional = professionalProfileRepository.save(professional);

        Subscription subscription = new Subscription();
        subscription.setProfessional(professional);
        subscription.setPlan(SubscriptionPlan.PLAN_PRO);
        subscription.setStatus(SubscriptionStatus.TRIAL);
        subscription.setProvider(PaymentProvider.MERCADOPAGO);
        subscription.setProviderSubscriptionId("sub-1");
        subscription.setPlanAmount(new BigDecimal("1990"));
        subscription.setCurrency("UYU");
        subscription.setCurrentPeriodStart(LocalDateTime.now());
        subscription.setCurrentPeriodEnd(LocalDateTime.now().plusMonths(1));
        subscriptionRepository.save(subscription);
    }

    @Test
    void duplicateWebhookMustNotDuplicateActivation() throws Exception {
        String payload = """
            {
              "id":"evt-1",
              "type":"payment",
              "action":"payment.updated",
              "status":"approved",
              "external_reference":"%d",
              "metadata":{"planCode":"PLAN_PRO"},
              "data":{"id":"pay-1"},
              "date_created":"2026-03-05T12:00:00Z"
            }
            """.formatted(professional.getId());

        String ts = String.valueOf(Instant.now().getEpochSecond());
        String requestId = "req-1";
        String manifest = "id:pay-1;request-id:req-1;ts:" + ts + ";";
        String signature = SignatureUtils.hmacSha256Hex("mp-webhook-secret", manifest);

        mockMvc.perform(post("/webhooks/mercadopago")
                .contentType("application/json")
                .header("X-Request-Id", requestId)
                .header("X-Signature", "ts=" + ts + ",v1=" + signature)
                .content(payload))
            .andExpect(status().isOk())
            .andExpect(content().string(containsString("PROCESSED")));

        mockMvc.perform(post("/webhooks/mercadopago")
                .contentType("application/json")
                .header("X-Request-Id", requestId)
                .header("X-Signature", "ts=" + ts + ",v1=" + signature)
                .content(payload))
            .andExpect(status().isOk())
            .andExpect(content().string(containsString("DUPLICATE")));

        Subscription updated = subscriptionRepository.findByProfessional_Id(professional.getId()).orElseThrow();
        org.junit.jupiter.api.Assertions.assertEquals(SubscriptionStatus.ACTIVE, updated.getStatus());
        org.junit.jupiter.api.Assertions.assertEquals(
            1,
            paymentEventRepository.countByProviderAndProviderEventId(PaymentProvider.MERCADOPAGO, "evt-1")
        );
        org.junit.jupiter.api.Assertions.assertEquals(
            1,
            paymentTransactionRepository.countByProviderAndProviderPaymentId(PaymentProvider.MERCADOPAGO, "pay-1")
        );
    }
}
