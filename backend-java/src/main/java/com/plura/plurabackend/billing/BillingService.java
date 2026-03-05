package com.plura.plurabackend.billing;

import com.plura.plurabackend.billing.dto.BillingCancelRequest;
import com.plura.plurabackend.billing.dto.BillingCheckoutRequest;
import com.plura.plurabackend.billing.dto.BillingCheckoutResponse;
import com.plura.plurabackend.billing.dto.BillingSubscriptionResponse;
import com.plura.plurabackend.billing.payments.model.PaymentProvider;
import com.plura.plurabackend.billing.payments.provider.PaymentProviderClient;
import com.plura.plurabackend.billing.payments.provider.ProviderCheckoutRequest;
import com.plura.plurabackend.billing.payments.provider.ProviderCheckoutSession;
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
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BillingService {

    private final BillingProperties billingProperties;
    private final ProfessionalProfileRepository professionalProfileRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final Map<PaymentProvider, PaymentProviderClient> providerClients;

    public BillingService(
        BillingProperties billingProperties,
        ProfessionalProfileRepository professionalProfileRepository,
        SubscriptionRepository subscriptionRepository,
        List<PaymentProviderClient> clients
    ) {
        this.billingProperties = billingProperties;
        this.professionalProfileRepository = professionalProfileRepository;
        this.subscriptionRepository = subscriptionRepository;

        Map<PaymentProvider, PaymentProviderClient> mapped = new EnumMap<>(PaymentProvider.class);
        for (PaymentProviderClient client : clients) {
            mapped.put(client.provider(), client);
        }
        this.providerClients = mapped;
    }

    @Transactional
    public BillingCheckoutResponse createCheckout(BillingCheckoutRequest request) {
        ensureBillingEnabled();

        Long userId = resolveAuthenticatedProfessionalUserId();
        ProfessionalProfile professional = loadEnabledProfessional(userId);
        SubscriptionPlan plan = SubscriptionPlan.fromCode(request.getPlanCode());
        PaymentProvider provider = PaymentProvider.fromCode(request.getProvider());

        if (!billingProperties.isProviderEnabled(provider)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Proveedor no habilitado");
        }

        BillingProperties.PlanConfig planConfig = billingProperties.resolvePlan(plan);

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
        subscription.setCancelAtPeriodEnd(false);
        subscription = subscriptionRepository.save(subscription);

        String webhookUrl = buildWebhookUrl(provider);
        PaymentProviderClient client = resolveProviderClient(provider);
        ProviderCheckoutSession session = client.createCheckout(new ProviderCheckoutRequest(
            subscription.getId(),
            professional.getId(),
            plan,
            planConfig.getPrice(),
            planConfig.getCurrency(),
            professional.getUser().getEmail(),
            professional.getUser().getFullName(),
            webhookUrl
        ));

        subscription.setProviderSubscriptionId(session.providerSubscriptionId());
        subscription.setProviderCustomerId(session.providerCustomerId());
        subscriptionRepository.save(subscription);

        return new BillingCheckoutResponse(
            subscription.getId(),
            session.checkoutUrl(),
            provider.name(),
            plan.name()
        );
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
        ensureBillingEnabled();

        Long userId = resolveAuthenticatedProfessionalUserId();
        ProfessionalProfile professional = loadEnabledProfessional(userId);
        Subscription subscription = subscriptionRepository.findByProfessionalIdForUpdate(professional.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No hay suscripción para cancelar"));

        boolean immediate = request != null && Boolean.TRUE.equals(request.getImmediate());

        PaymentProviderClient client = resolveProviderClient(subscription.getProvider());
        client.cancelSubscription(subscription.getProviderSubscriptionId(), immediate);

        if (immediate) {
            subscription.setStatus(SubscriptionStatus.CANCELLED);
            subscription.setCurrentPeriodEnd(LocalDateTime.now());
            subscription.setCancelAtPeriodEnd(false);
        } else {
            subscription.setCancelAtPeriodEnd(true);
        }

        subscriptionRepository.save(subscription);
        return toSubscriptionResponse(subscription);
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

    private String buildWebhookUrl(PaymentProvider provider) {
        String baseUrl = billingProperties.getWebhookBaseUrl();
        if (baseUrl == null || baseUrl.isBlank()) {
            return null;
        }

        String normalizedBase = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        return switch (provider) {
            case MERCADOPAGO -> normalizedBase + "/webhooks/mercadopago";
            case DLOCAL -> normalizedBase + "/webhooks/dlocal";
        };
    }
}
