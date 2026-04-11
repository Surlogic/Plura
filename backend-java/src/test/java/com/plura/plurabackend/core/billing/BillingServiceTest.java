package com.plura.plurabackend.core.billing;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.core.billing.dto.BillingCheckoutResponse;
import com.plura.plurabackend.core.billing.dto.BillingCreateSubscriptionRequest;
import com.plura.plurabackend.core.billing.mercadopago.MercadoPagoSubscriptionService;
import com.plura.plurabackend.core.billing.payments.provider.PaymentProviderClient;
import com.plura.plurabackend.core.billing.subscriptions.model.Subscription;
import com.plura.plurabackend.core.billing.subscriptions.model.SubscriptionPlanCode;
import com.plura.plurabackend.core.billing.subscriptions.model.SubscriptionStatus;
import com.plura.plurabackend.core.billing.subscriptions.repository.SubscriptionRepository;
import com.plura.plurabackend.core.professional.ProfessionalBillingSubjectGateway;
import com.plura.plurabackend.core.security.RoleGuard;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.model.UserRole;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class BillingServiceTest {

    private final BillingProperties billingProperties = new BillingProperties();
    private final ProfessionalBillingSubjectGateway professionalBillingSubjectGateway =
        mock(ProfessionalBillingSubjectGateway.class);
    private final SubscriptionRepository subscriptionRepository = mock(SubscriptionRepository.class);
    private final MercadoPagoSubscriptionService mercadoPagoSubscriptionService =
        mock(MercadoPagoSubscriptionService.class);
    private final RoleGuard roleGuard = mock(RoleGuard.class);

    private final BillingService service = new BillingService(
        billingProperties,
        professionalBillingSubjectGateway,
        subscriptionRepository,
        mercadoPagoSubscriptionService,
        roleGuard,
        List.<PaymentProviderClient>of()
    );

    @BeforeEach
    void setUp() {
        billingProperties.setEnabled(true);
        billingProperties.getMercadopago().setEnabled(true);
        billingProperties.getPlans().getPlanBasic().setPrice(BigDecimal.ZERO);
        billingProperties.getPlans().getPlanBasic().setCurrency("UYU");
        billingProperties.getPlans().getPlanProfesional().setPrice(new BigDecimal("100.00"));
        billingProperties.getPlans().getPlanProfesional().setCurrency("UYU");
        billingProperties.getPlans().getPlanEnterprise().setPrice(new BigDecimal("200.00"));
        billingProperties.getPlans().getPlanEnterprise().setCurrency("UYU");

        when(roleGuard.requireProfessional()).thenReturn(10L);
        when(professionalBillingSubjectGateway.loadEnabledProfessionalByUserId(10L))
            .thenReturn(professional(30L, "pro@plura.com"));
        when(subscriptionRepository.saveAndFlush(any(Subscription.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @ParameterizedTest
    @ValueSource(strings = {"pending", "authorized", "active", "paused"})
    void blocksDuplicateMercadoPagoCheckoutWhenRemoteSubscriptionIsStillOpen(String remoteStatus) {
        Subscription existing = existingSubscription("preapproval-open");
        when(subscriptionRepository.findByProfessionalIdForUpdate(30L)).thenReturn(Optional.of(existing));
        when(mercadoPagoSubscriptionService.getSubscription("preapproval-open"))
            .thenReturn(snapshot("preapproval-open", remoteStatus));

        ResponseStatusException error = assertThrows(ResponseStatusException.class, () ->
            service.createSubscription(createRequest(SubscriptionPlanCode.PLAN_PROFESIONAL.canonicalCode()))
        );

        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
        verify(mercadoPagoSubscriptionService, never()).createSubscription(any());
    }

    @Test
    void allowsNewCheckoutWhenPreviousMercadoPagoSubscriptionIsAlreadyCancelled() {
        Subscription existing = existingSubscription("preapproval-cancelled");
        when(subscriptionRepository.findByProfessionalIdForUpdate(30L)).thenReturn(Optional.of(existing));
        when(mercadoPagoSubscriptionService.getSubscription("preapproval-cancelled"))
            .thenReturn(snapshot("preapproval-cancelled", "cancelled"));
        when(mercadoPagoSubscriptionService.createSubscription(any()))
            .thenReturn(new MercadoPagoSubscriptionService.SubscriptionCheckoutSession(
                "preapproval-new",
                "https://mp.test/checkout",
                "plan-pro"
            ));

        BillingCheckoutResponse response =
            service.createSubscription(createRequest(SubscriptionPlanCode.PLAN_PROFESIONAL.canonicalCode()));

        assertEquals("https://mp.test/checkout", response.getCheckoutUrl());
        assertEquals("preapproval-new", existing.getProviderSubscriptionId());
        assertEquals(SubscriptionStatus.TRIAL, existing.getStatus());
        verify(mercadoPagoSubscriptionService).createSubscription(any());
    }

    private BillingCreateSubscriptionRequest createRequest(String planCode) {
        BillingCreateSubscriptionRequest request = new BillingCreateSubscriptionRequest();
        request.setPlanCode(planCode);
        return request;
    }

    private Subscription existingSubscription(String providerSubscriptionId) {
        Subscription subscription = new Subscription();
        subscription.setId("sub-1");
        subscription.setProfessionalId(30L);
        subscription.setPlan(SubscriptionPlanCode.PLAN_PROFESIONAL);
        subscription.setStatus(SubscriptionStatus.TRIAL);
        subscription.setProvider(com.plura.plurabackend.core.billing.payments.model.PaymentProvider.MERCADOPAGO);
        subscription.setProviderSubscriptionId(providerSubscriptionId);
        subscription.setPlanAmount(new BigDecimal("100.00"));
        subscription.setCurrency("UYU");
        subscription.setExpectedAmount(new BigDecimal("100.00"));
        subscription.setExpectedCurrency("UYU");
        subscription.setCurrentPeriodStart(LocalDateTime.now().minusDays(1));
        subscription.setCurrentPeriodEnd(LocalDateTime.now().plusDays(29));
        subscription.setCancelAtPeriodEnd(false);
        return subscription;
    }

    private MercadoPagoSubscriptionService.SubscriptionSnapshot snapshot(
        String providerSubscriptionId,
        String status
    ) {
        return new MercadoPagoSubscriptionService.SubscriptionSnapshot(
            providerSubscriptionId,
            status,
            new BigDecimal("100.00"),
            "UYU",
            30L,
            "pro@plura.com",
            "Plura PLAN_PRO"
        );
    }

    private ProfessionalProfile professional(Long professionalId, String email) {
        User user = new User();
        user.setId(10L);
        user.setEmail(email);
        user.setFullName("Profesional Demo");
        user.setPassword("secret");
        user.setRole(UserRole.PROFESSIONAL);

        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(professionalId);
        profile.setUser(user);
        profile.setDisplayName("Profesional Demo");
        profile.setRubro("Barberia");
        profile.setActive(true);
        return profile;
    }
}
