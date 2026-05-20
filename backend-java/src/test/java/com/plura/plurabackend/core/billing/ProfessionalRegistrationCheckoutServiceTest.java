package com.plura.plurabackend.core.billing;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.core.billing.dto.ProfessionalRegistrationCheckoutResponse;
import com.plura.plurabackend.core.billing.mercadopago.MercadoPagoSubscriptionService;
import com.plura.plurabackend.core.billing.payments.model.PaymentProvider;
import com.plura.plurabackend.core.billing.registration.ProfessionalRegistrationCheckoutIntent;
import com.plura.plurabackend.core.billing.registration.ProfessionalRegistrationCheckoutIntentRepository;
import com.plura.plurabackend.core.billing.registration.ProfessionalRegistrationCheckoutIntentStatus;
import com.plura.plurabackend.core.billing.subscriptions.model.SubscriptionPlanCode;
import com.plura.plurabackend.core.billing.subscriptions.repository.SubscriptionRepository;
import com.plura.plurabackend.core.professional.ProfessionalBillingSubjectGateway;
import com.plura.plurabackend.core.security.RoleGuard;
import com.plura.plurabackend.core.user.repository.UserRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ProfessionalRegistrationCheckoutServiceTest {

    @Mock
    private MercadoPagoSubscriptionService mercadoPagoSubscriptionService;

    @Mock
    private SubscriptionRepository subscriptionRepository;

    @Mock
    private ProfessionalRegistrationCheckoutIntentRepository checkoutIntentRepository;

    @Mock
    private ProfessionalBillingSubjectGateway professionalBillingSubjectGateway;

    @Mock
    private RoleGuard roleGuard;

    @Mock
    private UserRepository userRepository;

    private ProfessionalRegistrationCheckoutService service;

    @BeforeEach
    void setUp() {
        service = new ProfessionalRegistrationCheckoutService(
            new BillingProperties(),
            mercadoPagoSubscriptionService,
            subscriptionRepository,
            checkoutIntentRepository,
            professionalBillingSubjectGateway,
            roleGuard,
            userRepository,
            "unit-test-secret-with-enough-length",
            "plura-test"
        );
    }

    @Test
    void verifyCheckoutUsesIntentCreatedAtForPlanOnlyRecoveryWhenProviderIdIsMissing() {
        LocalDateTime createdAt = LocalDateTime.now().minusMinutes(5);
        ProfessionalRegistrationCheckoutIntent intent = new ProfessionalRegistrationCheckoutIntent();
        intent.setCheckoutRef("f2cc206bfced48feb2815698870e51ce");
        intent.setEmail("germanav12@gmail.com");
        intent.setPlanCode(SubscriptionPlanCode.PLAN_CORE);
        intent.setRegistrationReference("professional-registration:f2cc206bfced48feb2815698870e51ce");
        intent.setPreapprovalPlanId("6b8f40b885e24a59a257d1803bb08ce7");
        intent.setProvider(PaymentProvider.MERCADOPAGO);
        intent.setStatus(ProfessionalRegistrationCheckoutIntentStatus.PENDING);
        intent.setCheckoutUrl("https://www.mercadopago.com/subscriptions/checkout?preapproval_plan_id=6b8f");
        intent.setCreatedAt(createdAt);
        intent.setUpdatedAt(createdAt);
        intent.setExpiresAt(createdAt.plusHours(2));

        Instant checkoutIssuedAt = createdAt.atZone(ZoneId.systemDefault()).toInstant();
        MercadoPagoSubscriptionService.SubscriptionSnapshot snapshot =
            new MercadoPagoSubscriptionService.SubscriptionSnapshot(
                "mp-subscription-123",
                "authorized",
                BigDecimal.valueOf(100),
                "UYU",
                null,
                "mercadopago-not-provided@plura.test",
                "Plura PLAN_CORE",
                "6b8f40b885e24a59a257d1803bb08ce7",
                null,
                Instant.now(),
                Instant.now()
            );

        when(checkoutIntentRepository.findByCheckoutRefForUpdate(intent.getCheckoutRef()))
            .thenReturn(Optional.of(intent));
        when(mercadoPagoSubscriptionService.findSubscriptionByRegistrationReference(
            eq(intent.getRegistrationReference()),
            eq(intent.getEmail()),
            eq(intent.getPreapprovalPlanId()),
            eq(checkoutIssuedAt)
        )).thenReturn(Optional.of(snapshot));
        when(checkoutIntentRepository.saveAndFlush(intent)).thenReturn(intent);

        ProfessionalRegistrationCheckoutResponse response = service.verifyCheckout(null, intent.getCheckoutRef());

        assertTrue(response.getConfirmed());
        assertEquals("ACTIVE", response.getStatus());
        assertEquals("mp-subscription-123", intent.getProviderSubscriptionId());
        assertEquals(ProfessionalRegistrationCheckoutIntentStatus.CONFIRMED, intent.getStatus());
        verify(checkoutIntentRepository).saveAndFlush(intent);
    }
}
