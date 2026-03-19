package com.plura.plurabackend.core.billing;

import com.plura.plurabackend.core.billing.dto.BillingCancelRequest;
import com.plura.plurabackend.core.billing.dto.BillingCheckoutRequest;
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
import com.plura.plurabackend.core.professional.ProfessionalBillingSubjectGateway;
import com.plura.plurabackend.core.security.RoleGuard;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
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
        MercadoPagoSubscriptionService mercadoPagoSubscriptionService,
        RoleGuard roleGuard,
        List<PaymentProviderClient> clients
    ) {
        this.billingProperties = billingProperties;
        this.professionalBillingSubjectGateway = professionalBillingSubjectGateway;
        this.subscriptionRepository = subscriptionRepository;
        this.mercadoPagoSubscriptionService = mercadoPagoSubscriptionService;
        this.roleGuard = roleGuard;

        Map<PaymentProvider, PaymentProviderClient> mapped = new EnumMap<>(PaymentProvider.class);
        for (PaymentProviderClient client : clients) {
            mapped.put(client.provider(), client);
        }
        this.providerClients = mapped;
    }

    /**
     * Crea un checkout (DEPRECATED). Redirige internamente a createSubscription.
     * Solo soporta el proveedor MERCADOPAGO.
     *
     * @param request datos del checkout
     * @return respuesta con URL de checkout y datos de la suscripción
     */
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

    /**
     * Crea una nueva suscripción para el profesional autenticado.
     * Valida que billing esté habilitado, resuelve el profesional y el plan,
     * y delega la creación al servicio de MercadoPago.
     *
     * @param request datos de la suscripción con el código del plan
     * @return respuesta con URL de checkout y datos de la suscripción
     */
    @Transactional
    public BillingCheckoutResponse createSubscription(BillingCreateSubscriptionRequest request) {
        ensureBillingEnabled();

        Long userId = resolveAuthenticatedProfessionalUserId();
        ProfessionalProfile professional = loadEnabledProfessional(userId);
        SubscriptionPlanCode plan = SubscriptionPlanCode.fromCode(request.getPlanCode());
        return createMercadoPagoSubscription(professional, plan);
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

    @Transactional
    public Optional<Subscription> cancelSubscriptionForProfessionalId(Long professionalId, boolean immediate) {
        if (professionalId == null) {
            return Optional.empty();
        }
        return professionalBillingSubjectGateway.findById(professionalId)
            .flatMap(professional -> cancelSubscriptionForProfessional(professional, immediate));
    }

    /**
     * Crea una suscripción a través de MercadoPago.
     * Prepara la suscripción en estado TRIAL, crea la preapproval en MercadoPago
     * y devuelve la URL de checkout para que el usuario complete el pago.
     */
    private BillingCheckoutResponse createMercadoPagoSubscription(
        ProfessionalProfile professional,
        SubscriptionPlanCode plan
    ) {
        if (plan == SubscriptionPlanCode.PLAN_BASIC) {
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
            plan.canonicalCode()
        );
    }

    /**
     * Prepara o actualiza una suscripción en estado TRIAL.
     * Si ya existe una suscripción activa vigente, lanza excepción de conflicto.
     * Si no existe, crea una nueva; si existe pero no está activa, la reutiliza.
     */
    private Subscription prepareTrialSubscription(
        ProfessionalProfile professional,
        SubscriptionPlanCode plan,
        PaymentProvider provider,
        BillingProperties.PlanConfig planConfig
    ) {
        Subscription subscription = subscriptionRepository.findByProfessionalId(professional.getId())
            .orElseGet(Subscription::new);

        if (subscription.getId() != null
            && subscription.getStatus() == SubscriptionStatus.ACTIVE
            && subscription.getCurrentPeriodEnd() != null
            && subscription.getCurrentPeriodEnd().isAfter(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Ya tienes una suscripción activa hasta " + subscription.getCurrentPeriodEnd());
        }
        subscription.setProfessionalId(professional.getId());
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

    /** Verifica que el módulo de facturación esté habilitado. Lanza excepción si no lo está. */
    private void ensureBillingEnabled() {
        if (!billingProperties.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Billing deshabilitado");
        }
    }

    /** Resuelve el cliente del proveedor de pago. Lanza excepción si no está configurado. */
    private PaymentProviderClient resolveProviderClient(PaymentProvider provider) {
        PaymentProviderClient client = providerClients.get(provider);
        if (client == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Proveedor no configurado");
        }
        return client;
    }

    /** Carga un perfil profesional activo por ID de usuario. Lanza excepción si no existe o está inhabilitado. */
    private ProfessionalProfile loadEnabledProfessional(Long userId) {
        return professionalBillingSubjectGateway.loadEnabledProfessionalByUserId(userId);
    }

    /**
     * Resuelve el ID de usuario del profesional autenticado desde el contexto de seguridad.
     * Verifica que tenga rol ROLE_PROFESSIONAL y que el token sea válido.
     */
    private Long resolveAuthenticatedProfessionalUserId() {
        return roleGuard.requireProfessional();
    }

    /**
     * Convierte una entidad Subscription a su DTO de respuesta.
     * Calcula si la suscripción premium está habilitada (activa y dentro del período vigente).
     */
    private BillingSubscriptionResponse toSubscriptionResponse(Subscription subscription) {
        LocalDateTime now = LocalDateTime.now();
        boolean premiumEnabled = subscription.getStatus() == SubscriptionStatus.ACTIVE
            && subscription.getCurrentPeriodEnd() != null
            && !subscription.getCurrentPeriodEnd().isBefore(now);

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
            premiumEnabled
        );
    }
}
