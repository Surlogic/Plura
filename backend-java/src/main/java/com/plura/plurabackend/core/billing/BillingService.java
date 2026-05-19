package com.plura.plurabackend.core.billing;

import com.plura.plurabackend.core.billing.dto.BillingCancelRequest;
import com.plura.plurabackend.core.billing.dto.BillingCheckoutResponse;
import com.plura.plurabackend.core.billing.dto.BillingCreateSubscriptionRequest;
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
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Servicio principal de facturación.
 * Gestiona la creación de suscripciones, checkouts, consultas y cancelaciones
 * para los profesionales de la plataforma. Coordina con Mercado Pago y el
 * repositorio de suscripciones.
 */
@Service
public class BillingService {

    private static final Logger LOGGER = LoggerFactory.getLogger(BillingService.class);

    private final BillingProperties billingProperties;
    private final ProfessionalBillingSubjectGateway professionalBillingSubjectGateway;
    private final SubscriptionRepository subscriptionRepository;
    private final BillingTrialEligibilityService billingTrialEligibilityService;
    private final MercadoPagoSubscriptionService mercadoPagoSubscriptionService;
    private final RoleGuard roleGuard;
    /** Mapa de clientes de proveedores de pago indexado por tipo de proveedor */
    private final Map<PaymentProvider, PaymentProviderClient> providerClients;

    /**
     * Constructor que inyecta las dependencias y construye el mapa de clientes de proveedores.
     *
     * @param billingProperties configuración de facturación
     * @param professionalBillingSubjectGateway gateway de perfiles profesionales
     * @param subscriptionRepository repositorio de suscripciones
     * @param mercadoPagoSubscriptionService servicio de suscripciones de MercadoPago
     * @param clients lista de clientes de proveedores de pago disponibles
     */
    public BillingService(
        BillingProperties billingProperties,
        ProfessionalBillingSubjectGateway professionalBillingSubjectGateway,
        SubscriptionRepository subscriptionRepository,
        BillingTrialEligibilityService billingTrialEligibilityService,
        MercadoPagoSubscriptionService mercadoPagoSubscriptionService,
        RoleGuard roleGuard,
        List<PaymentProviderClient> clients
    ) {
        this.billingProperties = billingProperties;
        this.professionalBillingSubjectGateway = professionalBillingSubjectGateway;
        this.subscriptionRepository = subscriptionRepository;
        this.billingTrialEligibilityService = billingTrialEligibilityService;
        this.mercadoPagoSubscriptionService = mercadoPagoSubscriptionService;
        this.roleGuard = roleGuard;

        Map<PaymentProvider, PaymentProviderClient> mapped = new EnumMap<>(PaymentProvider.class);
        for (PaymentProviderClient client : clients) {
            mapped.put(client.provider(), client);
        }
        this.providerClients = mapped;
    }

    /**
     * Crea subscription validando datos de entrada y persistiendo el resultado.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    @Transactional
    public BillingCheckoutResponse createSubscription(BillingCreateSubscriptionRequest request) {
        ensureBillingEnabled();
        resolveRequestedCorePlan(request);

        Long userId = resolveAuthenticatedProfessionalUserId();
        ProfessionalProfile professional = loadEnabledProfessional(userId);
        return createCoreSubscription(professional);
    }

    /**
     * Obtiene la suscripción actual del profesional autenticado.
     *
     * @return datos de la suscripción activa
     * @throws ResponseStatusException si no existe suscripción activa
     */
    @Transactional(readOnly = true)
    public BillingSubscriptionResponse getCurrentSubscription() {
        Long userId = resolveAuthenticatedProfessionalUserId();
        ProfessionalProfile professional = loadEnabledProfessional(userId);

        Subscription subscription = subscriptionRepository.findByProfessionalId(professional.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No hay suscripción activa"));

        return toSubscriptionResponse(subscription);
    }

    /**
     * Cancela la suscripción del profesional autenticado desde el endpoint REST.
     *
     * @param request opciones de cancelación (inmediata o al final del período)
     * @return datos de la suscripción después de la cancelación
     */
    @Transactional
    public BillingSubscriptionResponse cancelSubscription(BillingCancelRequest request) {
        Long userId = resolveAuthenticatedProfessionalUserId();
        ProfessionalProfile professional = loadEnabledProfessional(userId);
        boolean immediate = request != null && Boolean.TRUE.equals(request.getImmediate());
        Subscription subscription = cancelSubscriptionForProfessional(professional, immediate)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No hay suscripción para cancelar"));
        return toSubscriptionResponse(subscription);
    }

    /**
     * Cancela la suscripción de un profesional específico.
     * Si la cancelación es inmediata, se marca como CANCELLED y se cierra el período actual.
     * Si no es inmediata, se marca para cancelar al final del período (cancelAtPeriodEnd).
     * También notifica al proveedor de pago remoto para cancelar la suscripción allí.
     *
     * @param professional el profesional cuya suscripción se cancela
     * @param immediate si la cancelación debe ser inmediata
     * @return la suscripción cancelada, o vacío si no existe
     */
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
        PaymentProvider provider = subscription.getProvider();
        boolean runtimeSupportedProvider = provider != null && provider.isRuntimeSupported();

        if (!alreadyCancelled && hasRemoteSubscription) {
            ensureBillingEnabled();
            if (provider == PaymentProvider.MERCADOPAGO) {
                mercadoPagoSubscriptionService.cancelSubscription(subscription.getProviderSubscriptionId());
            } else if (runtimeSupportedProvider) {
                PaymentProviderClient client = resolveProviderClient(provider);
                client.cancelSubscription(subscription.getProviderSubscriptionId(), immediate);
            } else {
                LOGGER.warn(
                    "Se omitio cancelacion remota para subscription legacy provider={} professionalId={} subscriptionId={}",
                    provider,
                    professional.getId(),
                    subscription.getId()
                );
            }
        }

        if (!runtimeSupportedProvider || provider == PaymentProvider.MERCADOPAGO || immediate) {
            subscription.setStatus(SubscriptionStatus.CANCELLED);
            subscription.setCurrentPeriodEnd(LocalDateTime.now());
            subscription.setCancelAtPeriodEnd(false);
        } else if (!alreadyCancelled) {
            subscription.setCancelAtPeriodEnd(true);
        }

        return Optional.of(subscriptionRepository.save(subscription));
    }

    /**
     * Cancela subscription for professional id respetando reglas de estado.
     */
    @Transactional
    public Optional<Subscription> cancelSubscriptionForProfessionalId(Long professionalId, boolean immediate) {
        if (professionalId == null) {
            return Optional.empty();
        }
        return professionalBillingSubjectGateway.findById(professionalId)
            .flatMap(professional -> cancelSubscriptionForProfessional(professional, immediate));
    }

    /**
     * Crea Mercado Pago subscription validando datos de entrada y persistiendo el resultado.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    private BillingCheckoutResponse createCoreSubscription(ProfessionalProfile professional) {
        BillingProperties.PlanConfig planConfig = billingProperties.resolvePlan(SubscriptionPlanCode.PLAN_CORE);
        Subscription subscription = subscriptionRepository.findByProfessionalIdForUpdate(professional.getId())
            .orElseGet(Subscription::new);

        validateCoreSubscriptionCanStart(subscription, professional);
        TrialEligibility trialEligibility = billingTrialEligibilityService.evaluateEligibility(
            SubscriptionPlanCode.PLAN_CORE,
            professional
        );
        boolean trialAlreadyUsedBySubscription = hasUsedTrial(subscription);
        boolean shouldStartTrial = trialEligibility.trialEligible() && !trialAlreadyUsedBySubscription;
        if (trialAlreadyUsedBySubscription && trialEligibility.trialEligible()) {
            billingTrialEligibilityService.ensureTrialClaim(
                SubscriptionPlanCode.PLAN_CORE,
                professional.getUser(),
                professional.getId()
            );
        }

        LocalDateTime trialStartAt = shouldStartTrial ? LocalDateTime.now() : null;
        LocalDateTime trialEndAt = shouldStartTrial ? trialStartAt.plusDays(30) : null;

        subscription.setProfessionalId(professional.getId());
        subscription.setPlan(SubscriptionPlanCode.PLAN_CORE);
        subscription.setStatus(shouldStartTrial ? SubscriptionStatus.TRIALING : SubscriptionStatus.CHECKOUT_PENDING);
        subscription.setProvider(PaymentProvider.MERCADOPAGO);
        subscription.setPlanAmount(planConfig.getPrice());
        subscription.setCurrency(planConfig.getCurrency());
        subscription.setExpectedAmount(planConfig.getPrice());
        subscription.setExpectedCurrency(planConfig.getCurrency());
        subscription.setTrialStartAt(trialStartAt);
        subscription.setTrialEndAt(trialEndAt);
        subscription.setPaymentMethodAttachedAt(null);
        subscription.setTrialSource("BILLING");
        subscription.setCurrentPeriodStart(null);
        subscription.setCurrentPeriodEnd(null);
        subscription.setCancelAtPeriodEnd(false);
        subscription.setProviderCustomerId(null);
        subscription.setProviderSubscriptionId(null);
        subscription = subscriptionRepository.saveAndFlush(subscription);
        if (shouldStartTrial) {
            billingTrialEligibilityService.claimTrialStarted(SubscriptionPlanCode.PLAN_CORE, professional);
        }

        String checkoutUrl = null;
        boolean requiresCheckout = false;
        if (billingProperties.getMercadopago().isEnabled()) {
            String payerEmail = resolveProfessionalPayerEmail(professional);
            MercadoPagoSubscriptionService.SubscriptionCheckoutSession session =
                mercadoPagoSubscriptionService.createSubscription(
                    new MercadoPagoSubscriptionService.CreateSubscriptionCommand(
                        subscription.getId(),
                        professional.getId(),
                        payerEmail,
                        SubscriptionPlanCode.PLAN_CORE,
                        planConfig.getPrice(),
                        planConfig.getCurrency()
                    )
                );
            subscription.setProviderSubscriptionId(session.providerSubscriptionId());
            checkoutUrl = session.checkoutUrl();
            requiresCheckout = checkoutUrl != null && !checkoutUrl.isBlank();
            if (requiresCheckout) {
                subscription.setStatus(SubscriptionStatus.CHECKOUT_PENDING);
            }
            subscription = subscriptionRepository.saveAndFlush(subscription);
        }

        return toCheckoutResponse(
            subscription,
            checkoutUrl,
            requiresCheckout,
            shouldStartTrial,
            !shouldStartTrial,
            shouldStartTrial ? "TRIAL" : "CHECKOUT"
        );
    }

    private void validateCoreSubscriptionCanStart(Subscription subscription, ProfessionalProfile professional) {
        if (subscription.getId() == null) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        if (isActiveStatus(subscription, now)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya tenés una suscripción activa.");
        }

        if (isTrialingStatus(subscription, now)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya tenés una prueba gratuita activa.");
        }

        if (subscription.getStatus() == SubscriptionStatus.CHECKOUT_PENDING) {
            assertNoOpenMercadoPagoSubscription(subscription, professional);
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Ya hay un checkout de Plura Core pendiente para esta cuenta."
            );
        }

    }

    @Transactional
    public void ensureTrialClaimBeforeAccountDeletion(Long professionalId, User user) {
        if (professionalId == null || user == null || user.getId() == null) {
            return;
        }
        subscriptionRepository.findByProfessionalId(professionalId)
            .filter(this::hasUsedTrial)
            .ifPresent(subscription ->
                billingTrialEligibilityService.ensureTrialClaim(SubscriptionPlanCode.PLAN_CORE, user, professionalId)
            );
    }

    private boolean hasUsedTrial(Subscription subscription) {
        return subscription != null
            && (subscription.getTrialStartAt() != null || subscription.getTrialEndAt() != null);
    }

    private void assertNoOpenMercadoPagoSubscription(Subscription subscription, ProfessionalProfile professional) {
        if (subscription.getProvider() != PaymentProvider.MERCADOPAGO) {
            return;
        }

        String providerSubscriptionId = subscription.getProviderSubscriptionId();
        if (providerSubscriptionId == null || providerSubscriptionId.isBlank()) {
            return;
        }

        MercadoPagoSubscriptionService.SubscriptionSnapshot snapshot =
            mercadoPagoSubscriptionService.getSubscription(providerSubscriptionId);
        String remoteStatus = normalizeMercadoPagoSubscriptionStatus(snapshot.status());
        if (!isOpenMercadoPagoSubscriptionStatus(remoteStatus)) {
            return;
        }

        LOGGER.warn(
            "Blocked duplicate Mercado Pago subscription checkout professionalId={} subscriptionId={} providerSubscriptionId={} remoteStatus={} currentPlan={} requestedPlan={}",
            professional == null ? null : professional.getId(),
            subscription.getId(),
            providerSubscriptionId,
            remoteStatus,
            subscription.getPlan(),
            SubscriptionPlanCode.PLAN_CORE
        );
        throw new ResponseStatusException(
            HttpStatus.CONFLICT,
            "Ya hay una suscripción de Mercado Pago en curso o activa para esta cuenta. Cancelala antes de iniciar otra."
        );
    }

    /**
     * Normaliza Mercado Pago subscription estado para evitar variantes vacias, invalidas o inconsistentes.
     */
    private String normalizeMercadoPagoSubscriptionStatus(String status) {
        if (status == null) {
            return "";
        }
        return status.trim().toLowerCase(Locale.ROOT);
    }

    /**
     * Evalua is open Mercado Pago subscription estado y devuelve una decision booleana para el llamador.
     */
    private boolean isOpenMercadoPagoSubscriptionStatus(String status) {
        return "pending".equals(status)
            || "authorized".equals(status)
            || "active".equals(status)
            || "paused".equals(status);
    }

    private boolean isActiveStatus(Subscription subscription, LocalDateTime now) {
        return subscription.getStatus() == SubscriptionStatus.ACTIVE
            && (subscription.getCurrentPeriodEnd() == null || !subscription.getCurrentPeriodEnd().isBefore(now));
    }

    private boolean isTrialingStatus(Subscription subscription, LocalDateTime now) {
        return (subscription.getStatus() == SubscriptionStatus.TRIALING || subscription.getStatus() == SubscriptionStatus.TRIAL)
            && subscription.getTrialEndAt() != null
            && subscription.getTrialEndAt().isAfter(now);
    }

    /**
     * Ejecuta la logica de ensure billing enabled manteniendola encapsulada en este componente.
     */
    private void ensureBillingEnabled() {
        if (!billingProperties.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Billing deshabilitado");
        }
    }

    private SubscriptionPlanCode resolveRequestedCorePlan(BillingCreateSubscriptionRequest request) {
        try {
            return SubscriptionPlanCode.fromCode(request == null ? null : request.getPlanCode());
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                exception.getMessage()
            );
        }
    }

    /**
     * Resuelve proveedor cliente normalizando entradas, defaults y casos borde.
     */
    private PaymentProviderClient resolveProviderClient(PaymentProvider provider) {
        PaymentProviderClient client = providerClients.get(provider);
        if (client == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Proveedor no configurado");
        }
        return client;
    }

    /**
     * Carga la seccion enabled profesional desde base de datos o datos agregados y la deja lista para la respuesta.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
    private ProfessionalProfile loadEnabledProfessional(Long userId) {
        return professionalBillingSubjectGateway.loadEnabledProfessionalByUserId(userId);
    }

    /**
     * Resuelve authenticated profesional usuario ID normalizando entradas, defaults y casos borde.
     */
    private Long resolveAuthenticatedProfessionalUserId() {
        return roleGuard.requireProfessional();
    }

    /**
     * Convierte datos internos al formato subscription respuesta esperado por el consumidor.
     */
    private BillingSubscriptionResponse toSubscriptionResponse(Subscription subscription) {
        if (subscription == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No hay suscripción activa");
        }
        if (subscription.getPlan() == null || subscription.getStatus() == null || subscription.getProvider() == null) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "La suscripcion tiene datos incompletos. Volvé a crear el checkout o revisá el estado desde soporte."
            );
        }
        LocalDateTime now = LocalDateTime.now();
        boolean trialActive = subscription.getTrialEndAt() != null && subscription.getTrialEndAt().isAfter(now);
        long trialDaysRemaining = trialActive
            ? Math.max(0, ChronoUnit.DAYS.between(now.toLocalDate(), subscription.getTrialEndAt().toLocalDate()))
            : 0;
        boolean planEnabled = isActiveStatus(subscription, now)
            || (subscription.getStatus() == SubscriptionStatus.TRIALING && trialActive);

        return new BillingSubscriptionResponse(
            subscription.getId(),
            subscription.getPlan().canonicalCode(),
            subscription.getStatus().name(),
            subscription.getProvider().name(),
            subscription.getPlanAmount(),
            subscription.getCurrency(),
            subscription.getCurrentPeriodStart(),
            subscription.getCurrentPeriodEnd(),
            subscription.getCancelAtPeriodEnd(),
            planEnabled,
            subscription.getTrialStartAt(),
            subscription.getTrialEndAt(),
            trialDaysRemaining,
            trialActive,
            subscription.getPaymentMethodAttachedAt() != null
        );
    }

    private BillingCheckoutResponse toCheckoutResponse(
        Subscription subscription,
        String checkoutUrl,
        boolean requiresCheckout,
        boolean trialEligible,
        boolean trialPreviouslyUsed,
        String activationMode
    ) {
        return new BillingCheckoutResponse(
            subscription.getId(),
            checkoutUrl,
            subscription.getProvider().name(),
            subscription.getPlan().canonicalCode(),
            subscription.getStatus().name(),
            subscription.getTrialStartAt(),
            subscription.getTrialEndAt(),
            requiresCheckout,
            trialEligible,
            trialPreviouslyUsed,
            activationMode
        );
    }

    /**
     * Resuelve profesional payer email normalizando entradas, defaults y casos borde.
     */
    private String resolveProfessionalPayerEmail(ProfessionalProfile professional) {
        if (professional == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Profesional invalido para iniciar la suscripcion");
        }
        User user = professional.getUser();
        if (user == null) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "El profesional no tiene usuario asociado para iniciar la suscripcion"
            );
        }
        String email = user.getEmail();
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "El profesional necesita un email valido para iniciar la suscripcion"
            );
        }
        return email.trim();
    }
}
