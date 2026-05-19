package com.plura.plurabackend.core.billing;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.core.billing.dto.BillingCreateSubscriptionRequest;
import com.plura.plurabackend.core.billing.dto.BillingCheckoutResponse;
import com.plura.plurabackend.core.billing.dto.BillingSubscriptionResponse;
import com.plura.plurabackend.core.billing.mercadopago.MercadoPagoSubscriptionService;
import com.plura.plurabackend.core.billing.payments.model.PaymentProvider;
import com.plura.plurabackend.core.billing.payments.provider.PaymentProviderClient;
import com.plura.plurabackend.core.billing.subscriptions.model.Subscription;
import com.plura.plurabackend.core.billing.subscriptions.model.SubscriptionPlanCode;
import com.plura.plurabackend.core.billing.subscriptions.model.SubscriptionStatus;
import com.plura.plurabackend.core.billing.subscriptions.repository.SubscriptionRepository;
import com.plura.plurabackend.core.billing.trial.BillingTrialEligibilityService;
import com.plura.plurabackend.core.billing.trial.BillingTrialEligibilityService.TrialEligibility;
import com.plura.plurabackend.core.professional.ProfessionalBillingSubjectGateway;
import com.plura.plurabackend.core.security.RoleGuard;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.model.UserRole;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Tests de servicios core compartidos / billing, pagos, webhooks y proveedores.
 * Cubren escenarios de billing servicio para documentar el comportamiento esperado y evitar regresiones.
 * Mantener estos casos alineados con los contratos reales del backend cuando cambie la logica productiva.
 */
class BillingServiceTest {

    private final BillingProperties billingProperties = new BillingProperties();
    private final ProfessionalBillingSubjectGateway professionalBillingSubjectGateway =
        mock(ProfessionalBillingSubjectGateway.class);
    private final SubscriptionRepository subscriptionRepository = mock(SubscriptionRepository.class);
    private final BillingTrialEligibilityService billingTrialEligibilityService = mock(BillingTrialEligibilityService.class);
    private final MercadoPagoSubscriptionService mercadoPagoSubscriptionService =
        mock(MercadoPagoSubscriptionService.class);
    private final RoleGuard roleGuard = mock(RoleGuard.class);

    private final BillingService service = new BillingService(
        billingProperties,
        professionalBillingSubjectGateway,
        subscriptionRepository,
        billingTrialEligibilityService,
        mercadoPagoSubscriptionService,
        roleGuard,
        List.<PaymentProviderClient>of()
    );

    /**
     * Prepara mocks, datos base o configuracion comun antes de cada caso de prueba.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @BeforeEach
    void setUp() {
        billingProperties.setEnabled(true);
        billingProperties.getMercadopago().setEnabled(true);
        billingProperties.getPlans().getCore().setPrice(new BigDecimal("990.00"));
        billingProperties.getPlans().getCore().setCurrency("UYU");

        when(roleGuard.requireProfessional()).thenReturn(10L);
        when(professionalBillingSubjectGateway.loadEnabledProfessionalByUserId(10L))
            .thenReturn(professional(30L, "pro@plura.com"));
        when(subscriptionRepository.saveAndFlush(any(Subscription.class)))
            .thenAnswer(invocation -> {
                Subscription subscription = invocation.getArgument(0);
                if (subscription.getId() == null) {
                    subscription.setId(UUID.randomUUID().toString());
                }
                return subscription;
            });
        when(billingTrialEligibilityService.evaluateEligibility(eq(SubscriptionPlanCode.PLAN_CORE), any(ProfessionalProfile.class)))
            .thenReturn(new TrialEligibility(true, false));
    }

    /**
     * Escenario: bloquea duplicado Mercado Pago checkout cuando remote suscripcion is still open.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void rejectsLegacyPlanCodeWithBadRequest() {
        when(subscriptionRepository.findByProfessionalIdForUpdate(30L)).thenReturn(Optional.empty());

        ResponseStatusException error = assertThrows(ResponseStatusException.class, () ->
            service.createSubscription(createRequest("PLAN_LOCAL"))
        );

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        assertEquals("planCode inválido: PLAN_LOCAL", error.getReason());
        verify(subscriptionRepository, never()).saveAndFlush(any());
        verify(mercadoPagoSubscriptionService, never()).createSubscription(any());
    }

    @Test
    void allowsCoreAliasCreatesClaimAndCreatesThirtyDayTrialWithCheckoutPending() {
        when(subscriptionRepository.findByProfessionalIdForUpdate(30L)).thenReturn(Optional.empty());
        when(mercadoPagoSubscriptionService.createSubscription(any()))
            .thenReturn(new MercadoPagoSubscriptionService.SubscriptionCheckoutSession(
                "mp-sub-1",
                "https://checkout.test",
                "plan-core"
            ));

        BillingCheckoutResponse response = service.createSubscription(createRequest("CORE"));

        assertEquals("https://checkout.test", response.getCheckoutUrl());
        assertEquals("MERCADOPAGO", response.getProvider());
        assertEquals("PLAN_CORE", response.getPlanCode());
        assertEquals("CHECKOUT_PENDING", response.getStatus());
        assertTrue(response.getRequiresCheckout());
        assertNotNull(response.getTrialStartAt());
        assertNotNull(response.getTrialEndAt());
        assertEquals(response.getTrialStartAt().plusDays(30), response.getTrialEndAt());
        assertEquals(Boolean.TRUE, response.getTrialEligible());
        assertEquals(Boolean.FALSE, response.getTrialPreviouslyUsed());
        assertEquals("TRIAL", response.getActivationMode());
        verify(billingTrialEligibilityService).evaluateEligibility(eq(SubscriptionPlanCode.PLAN_CORE), any(ProfessionalProfile.class));
        verify(billingTrialEligibilityService).claimTrialStarted(eq(SubscriptionPlanCode.PLAN_CORE), any(ProfessionalProfile.class));
    }

    @Test
    void repeatedTrialFromSubscriptionHistoryCreatesDirectCheckout() {
        Subscription existing = existingSubscription("sub-old");
        existing.setStatus(SubscriptionStatus.CANCELLED);
        existing.setTrialStartAt(LocalDateTime.now().minusMonths(3));
        existing.setTrialEndAt(LocalDateTime.now().minusMonths(1));
        when(subscriptionRepository.findByProfessionalIdForUpdate(30L)).thenReturn(Optional.of(existing));
        when(mercadoPagoSubscriptionService.createSubscription(any()))
            .thenReturn(new MercadoPagoSubscriptionService.SubscriptionCheckoutSession(
                "mp-sub-direct-1",
                "https://checkout-direct.test",
                "plan-core"
            ));

        BillingCheckoutResponse response = service.createSubscription(createRequest("PLAN_CORE"));

        assertEquals("https://checkout-direct.test", response.getCheckoutUrl());
        assertEquals("CHECKOUT_PENDING", response.getStatus());
        assertTrue(response.getRequiresCheckout());
        assertEquals(Boolean.FALSE, response.getTrialEligible());
        assertEquals(Boolean.TRUE, response.getTrialPreviouslyUsed());
        assertEquals("CHECKOUT", response.getActivationMode());
        assertEquals(null, response.getTrialStartAt());
        assertEquals(null, response.getTrialEndAt());
        verify(billingTrialEligibilityService).ensureTrialClaim(
            eq(SubscriptionPlanCode.PLAN_CORE),
            any(User.class),
            eq(30L)
        );
        verify(billingTrialEligibilityService, never()).claimTrialStarted(any(), any());
        verify(mercadoPagoSubscriptionService).createSubscription(any());
    }

    @Test
    void repeatedTrialFromHistoricalIdentityCreatesDirectCheckout() {
        when(subscriptionRepository.findByProfessionalIdForUpdate(30L)).thenReturn(Optional.empty());
        when(billingTrialEligibilityService.evaluateEligibility(eq(SubscriptionPlanCode.PLAN_CORE), any(ProfessionalProfile.class)))
            .thenReturn(new TrialEligibility(false, true));
        when(mercadoPagoSubscriptionService.createSubscription(any()))
            .thenReturn(new MercadoPagoSubscriptionService.SubscriptionCheckoutSession(
                "mp-sub-direct-2",
                "https://checkout-used-identity.test",
                "plan-core"
            ));

        BillingCheckoutResponse response = service.createSubscription(createRequest("PLAN_CORE"));

        assertEquals("https://checkout-used-identity.test", response.getCheckoutUrl());
        assertEquals("CHECKOUT_PENDING", response.getStatus());
        assertEquals(Boolean.FALSE, response.getTrialEligible());
        assertEquals(Boolean.TRUE, response.getTrialPreviouslyUsed());
        assertEquals("CHECKOUT", response.getActivationMode());
        assertEquals(null, response.getTrialStartAt());
        assertEquals(null, response.getTrialEndAt());
        verify(billingTrialEligibilityService, never()).ensureTrialClaim(any(), any(), any());
        verify(billingTrialEligibilityService, never()).claimTrialStarted(any(), any());
        verify(mercadoPagoSubscriptionService).createSubscription(any());
    }

    @Test
    void getSubscriptionReturnsActiveTrialFieldsAndPlanEnabled() {
        Subscription subscription = existingSubscription("mp-sub-1");
        subscription.setPlan(SubscriptionPlanCode.PLAN_CORE);
        subscription.setStatus(SubscriptionStatus.TRIALING);
        subscription.setTrialStartAt(LocalDateTime.now().minusDays(1));
        subscription.setTrialEndAt(LocalDateTime.now().plusDays(10));
        when(subscriptionRepository.findByProfessionalId(30L)).thenReturn(Optional.of(subscription));

        BillingSubscriptionResponse response = service.getCurrentSubscription();

        assertEquals("PLAN_CORE", response.getPlanCode());
        assertTrue(response.getTrialActive());
        assertTrue(response.getTrialDaysRemaining() > 0);
        assertTrue(response.isPlanEnabled());
        assertFalse(response.getPaymentMethodAttached());
    }

    @Test
    void getSubscriptionReturnsInactiveTrialWhenExpired() {
        Subscription subscription = existingSubscription("mp-sub-1");
        subscription.setPlan(SubscriptionPlanCode.PLAN_CORE);
        subscription.setStatus(SubscriptionStatus.TRIALING);
        subscription.setTrialStartAt(LocalDateTime.now().minusMonths(3));
        subscription.setTrialEndAt(LocalDateTime.now().minusDays(1));
        when(subscriptionRepository.findByProfessionalId(30L)).thenReturn(Optional.of(subscription));

        BillingSubscriptionResponse response = service.getCurrentSubscription();

        assertFalse(response.getTrialActive());
        assertEquals(0L, response.getTrialDaysRemaining());
        assertFalse(response.isPlanEnabled());
    }

    @Test
    void getSubscriptionMarksPaymentMethodAttached() {
        Subscription subscription = existingSubscription("mp-sub-1");
        subscription.setPlan(SubscriptionPlanCode.PLAN_CORE);
        subscription.setStatus(SubscriptionStatus.CHECKOUT_PENDING);
        subscription.setTrialStartAt(LocalDateTime.now());
        subscription.setTrialEndAt(LocalDateTime.now().plusDays(30));
        subscription.setPaymentMethodAttachedAt(LocalDateTime.now());
        when(subscriptionRepository.findByProfessionalId(30L)).thenReturn(Optional.of(subscription));

        BillingSubscriptionResponse response = service.getCurrentSubscription();

        assertTrue(response.getPaymentMethodAttached());
        assertFalse(response.isPlanEnabled());
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
        subscription.setPlan(SubscriptionPlanCode.PLAN_CORE);
        subscription.setStatus(SubscriptionStatus.CHECKOUT_PENDING);
        subscription.setProvider(PaymentProvider.MERCADOPAGO);
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

    private ProfessionalProfile professional(Long professionalId, String email) {
        User user = new User();
        user.setId(10L);
        user.setEmail(email);
        user.setPhoneNumber("+59899123456");
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
