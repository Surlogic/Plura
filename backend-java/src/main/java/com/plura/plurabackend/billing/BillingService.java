package com.plura.plurabackend.billing;

import com.plura.plurabackend.billing.dto.BillingCancelRequest;
import com.plura.plurabackend.billing.dto.BillingCheckoutRequest;
import com.plura.plurabackend.billing.dto.BillingCheckoutResponse;
import com.plura.plurabackend.billing.dto.BillingCreateSubscriptionRequest;
import com.plura.plurabackend.billing.dto.BillingSubscriptionResponse;
import com.plura.plurabackend.billing.mercadopago.MercadoPagoSubscriptionService;
import com.plura.plurabackend.billing.payments.model.PaymentProvider;
import com.plura.plurabackend.billing.payments.provider.PaymentProviderClient;
import com.plura.plurabackend.billing.subscriptions.model.Subscription;
import com.plura.plurabackend.billing.subscriptions.model.SubscriptionPlan;
import com.plura.plurabackend.billing.subscriptions.model.SubscriptionStatus;
import com.plura.plurabackend.billing.subscriptions.repository.SubscriptionRepository;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BillingService {

    private static final Logger LOGGER = LoggerFactory.getLogger(BillingService.class);

    private final BillingProperties billingProperties;
    private final ProfessionalProfileRepository professionalProfileRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final MercadoPagoSubscriptionService mercadoPagoSubscriptionService;
    private final Map<PaymentProvider, PaymentProviderClient> providerClients;

    public BillingService(
        BillingProperties billingProperties,
        ProfessionalProfileRepository professionalProfileRepository,
        SubscriptionRepository subscriptionRepository,
        MercadoPagoSubscriptionService mercadoPagoSubscriptionService,
        List<PaymentProviderClient> clients
    ) {
        this.billingProperties = billingProperties;
        this.professionalProfileRepository = professionalProfileRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.mercadoPagoSubscriptionService = mercadoPagoSubscriptionService;

        Map<PaymentProvider, PaymentProviderClient> mapped = new EnumMap<>(PaymentProvider.class);
        for (PaymentProviderClient client : clients) {
            mapped.put(client.provider(), client);
        }
        this.providerClients = mapped;
    }

    @Transactional
    public BillingCheckoutResponse createCheckout(BillingCheckoutRequest request) {
        LOGGER.warn("POST /billing/checkout esta deprecated. Redirigiendo internamente a createSubscription.");
        if (request.getProvider() != null
            && !request.getProvider().isBlank()
            && PaymentProvider.fromCode(request.getProvider()) != PaymentProvider.MERCADOPAGO) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Solo MERCADOPAGO esta soportado para billing");
        }
        BillingCreateSubscriptionRequest subscriptionRequest = new BillingCreateSubscriptionRequest();
        subscriptionRequest.setPlanCode(request.getPlanCode());
        return createSubscription(subscriptionRequest);
    }

    @Transactional
    public BillingCheckoutResponse createSubscription(BillingCreateSubscriptionRequest request) {
        ensureBillingEnabled();

        Long userId = resolveAuthenticatedProfessionalUserId();
        ProfessionalProfile professional = loadEnabledProfessional(userId);
        SubscriptionPlan plan = SubscriptionPlan.fromCode(request.getPlanCode());
        return createMercadoPagoSubscription(professional, plan);
    }

    @Transactional(readOnly = true)
    public BillingSubscriptionResponse getCurrentSubscription() {
        Long userId = resolveAuthenticatedProfessionalUserId();
        ProfessionalProfile professional = loadEnabledProfessional(userId);

        Subscription subscription = subscriptionRepository.findByProfessional_Id(professional.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No hay suscripción activa"));

        return toSubscriptionResponse(subscription);
    }

    @Transactional
    public BillingSubscriptionResponse cancelSubscription(BillingCancelRequest request) {
        Long userId = resolveAuthenticatedProfessionalUserId();
        ProfessionalProfile professional = loadEnabledProfessional(userId);
        boolean immediate = request != null && Boolean.TRUE.equals(request.getImmediate());
        Subscription subscription = cancelSubscriptionForProfessional(professional, immediate)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No hay suscripción para cancelar"));
        return toSubscriptionResponse(subscription);
    }

    @Transactional
    public Optional<Subscription> cancelSubscriptionForProfessional(
        ProfessionalProfile professional,
        boolean immediate
    ) {
        if (professional == null || professional.getId() == null) {
            return Optional.empty();
        }

        Subscription subscription = subscriptionRepository.findByProfessionalIdForUpdate(professional.getId())
            .orElse(null);
        if (subscription == null) {
            return Optional.empty();
        }

        boolean alreadyCancelled = subscription.getStatus() == SubscriptionStatus.CANCELLED;
        boolean hasRemoteSubscription = subscription.getProviderSubscriptionId() != null
            && !subscription.getProviderSubscriptionId().isBlank();

        if (!alreadyCancelled && hasRemoteSubscription) {
            ensureBillingEnabled();
            if (subscription.getProvider() == PaymentProvider.MERCADOPAGO) {
                mercadoPagoSubscriptionService.cancelSubscription(subscription.getProviderSubscriptionId());
            } else {
                PaymentProviderClient client = resolveProviderClient(subscription.getProvider());
                client.cancelSubscription(subscription.getProviderSubscriptionId(), immediate);
            }
        }

        if (subscription.getProvider() == PaymentProvider.MERCADOPAGO || immediate) {
            subscription.setStatus(SubscriptionStatus.CANCELLED);
            subscription.setCurrentPeriodEnd(LocalDateTime.now());
            subscription.setCancelAtPeriodEnd(false);
        } else if (!alreadyCancelled) {
            subscription.setCancelAtPeriodEnd(true);
        }

        return Optional.of(subscriptionRepository.save(subscription));
    }

    private BillingCheckoutResponse createMercadoPagoSubscription(
        ProfessionalProfile professional,
        SubscriptionPlan plan
    ) {
        if (plan == SubscriptionPlan.PLAN_BASIC) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "PLAN_BASIC no requiere checkout");
        }
        if (!billingProperties.getMercadopago().isEnabled()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mercado Pago no habilitado");
        }

        BillingProperties.PlanConfig planConfig = billingProperties.resolvePlan(plan);
        Subscription subscription = prepareTrialSubscription(
            professional,
            plan,
            PaymentProvider.MERCADOPAGO,
            planConfig
        );

        MercadoPagoSubscriptionService.SubscriptionCheckoutSession session =
            mercadoPagoSubscriptionService.createSubscription(
                new MercadoPagoSubscriptionService.CreateSubscriptionCommand(
                    subscription.getId(),
                    professional.getId(),
                    professional.getUser().getEmail(),
                    plan,
                    planConfig.getPrice(),
                    planConfig.getCurrency()
                )
            );

        subscription.setProviderSubscriptionId(session.providerSubscriptionId());
        subscriptionRepository.save(subscription);

        return new BillingCheckoutResponse(
            subscription.getId(),
            session.checkoutUrl(),
            PaymentProvider.MERCADOPAGO.name(),
            plan.name()
        );
    }

    private Subscription prepareTrialSubscription(
        ProfessionalProfile professional,
        SubscriptionPlan plan,
        PaymentProvider provider,
        BillingProperties.PlanConfig planConfig
    ) {
        Subscription subscription = subscriptionRepository.findByProfessional_Id(professional.getId())
            .orElseGet(Subscription::new);
        subscription.setProfessional(professional);
        subscription.setPlan(plan);
        subscription.setStatus(SubscriptionStatus.TRIAL);
        subscription.setProvider(provider);
        subscription.setPlanAmount(planConfig.getPrice());
        subscription.setCurrency(planConfig.getCurrency());
        subscription.setExpectedAmount(planConfig.getPrice());
        subscription.setExpectedCurrency(planConfig.getCurrency());
        subscription.setCurrentPeriodStart(null);
        subscription.setCurrentPeriodEnd(null);
        subscription.setCancelAtPeriodEnd(false);
        if (provider != PaymentProvider.MERCADOPAGO) {
            subscription.setProviderSubscriptionId(null);
        }
        subscription.setProviderCustomerId(null);
        return subscriptionRepository.save(subscription);
    }

    private void ensureBillingEnabled() {
        if (!billingProperties.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Billing deshabilitado");
        }
    }

    private PaymentProviderClient resolveProviderClient(PaymentProvider provider) {
        PaymentProviderClient client = providerClients.get(provider);
        if (client == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Proveedor no configurado");
        }
        return client;
    }

    private ProfessionalProfile loadEnabledProfessional(Long userId) {
        ProfessionalProfile professional = professionalProfileRepository.findByUser_Id(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Perfil profesional no encontrado"));
        if (!Boolean.TRUE.equals(professional.getActive())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Profesional inhabilitado");
        }
        return professional;
    }

    private Long resolveAuthenticatedProfessionalUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sin sesión activa");
        }

        boolean isProfessional = authentication.getAuthorities().stream()
            .anyMatch(auth -> "ROLE_PROFESSIONAL".equals(auth.getAuthority()));
        if (!isProfessional) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo profesionales");
        }

        try {
            return Long.parseLong(authentication.getPrincipal().toString());
        } catch (NumberFormatException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token inválido");
        }
    }

    private BillingSubscriptionResponse toSubscriptionResponse(Subscription subscription) {
        LocalDateTime now = LocalDateTime.now();
        boolean premiumEnabled = subscription.getStatus() == SubscriptionStatus.ACTIVE
            && subscription.getCurrentPeriodEnd() != null
            && !subscription.getCurrentPeriodEnd().isBefore(now);

        return new BillingSubscriptionResponse(
            subscription.getId(),
            subscription.getPlan().name(),
            subscription.getStatus().name(),
            subscription.getProvider().name(),
            subscription.getPlanAmount(),
            subscription.getCurrency(),
            subscription.getCurrentPeriodStart(),
            subscription.getCurrentPeriodEnd(),
            subscription.getCancelAtPeriodEnd(),
            premiumEnabled
        );
    }
}
