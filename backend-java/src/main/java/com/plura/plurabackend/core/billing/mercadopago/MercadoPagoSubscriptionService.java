package com.plura.plurabackend.core.billing.mercadopago;

import com.plura.plurabackend.core.billing.BillingProperties;
import com.plura.plurabackend.core.billing.subscriptions.model.SubscriptionPlanCode;
import java.math.BigDecimal;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * MercadoPagoSubscriptionService es un servicio de negocio del modulo billing / Mercado Pago.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: billingProperties, mercadoPagoClient.
 * Foco funcional: suscripciones, Mercado Pago, servicios.
 */
@Service
public class MercadoPagoSubscriptionService {

    private static final Logger LOGGER = LoggerFactory.getLogger(MercadoPagoSubscriptionService.class);

    private final BillingProperties billingProperties;
    private final MercadoPagoClient mercadoPagoClient;
    private final Map<SubscriptionPlanCode, HostedPlanTarget> runtimePlans = new ConcurrentHashMap<>();

    public MercadoPagoSubscriptionService(
        BillingProperties billingProperties,
        MercadoPagoClient mercadoPagoClient
    ) {
        this.billingProperties = billingProperties;
        this.mercadoPagoClient = mercadoPagoClient;
    }

    /**
     * Crea subscription validando datos de entrada y persistiendo el resultado.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    public SubscriptionCheckoutSession createSubscription(CreateSubscriptionCommand command) {
        if (!billingProperties.getMercadopago().isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Mercado Pago deshabilitado");
        }
        if (command.plan() == SubscriptionPlanCode.PLAN_PROFESSIONAL) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "PLAN_PROFESSIONAL no requiere suscripcion");
        }

        String backUrl = resolveBackUrl();
        HostedPlanTarget hostedPlan = resolveOrCreatePlan(command.plan(), command.amount(), command.currency(), backUrl);

        try {
            String notificationUrl = resolveNotificationUrl();
            MercadoPagoClient.MercadoPagoPreapproval preapproval = mercadoPagoClient.createPreapproval(
                new MercadoPagoClient.CreatePreapprovalRequest(
                    hostedPlan.planId(),
                    command.payerEmail(),
                    backUrl,
                    "pending",
                    "subscription:" + command.professionalId(),
                    "Plura " + command.plan().name(),
                    notificationUrl
                )
            );

            return new SubscriptionCheckoutSession(preapproval.id(), preapproval.checkoutUrl(), hostedPlan.planId());
        } catch (ResponseStatusException exception) {
            String reason = exception.getReason() == null ? "" : exception.getReason().toLowerCase();
            if (!reason.contains("card_token_id")) {
                throw exception;
            }

            if (hostedPlan.checkoutUrl() == null || hostedPlan.checkoutUrl().isBlank()) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Mercado Pago exige card_token_id y no devolvio init_point del plan"
                );
            }

            LOGGER.warn(
                "Mercado Pago requirio card_token_id para preapproval. Usando init_point de preapproval_plan plan={} professionalId={}",
                command.plan(),
                command.professionalId()
            );

            return new SubscriptionCheckoutSession(null, hostedPlan.checkoutUrl(), hostedPlan.planId());
        }
    }

    public SubscriptionSnapshot getSubscription(String providerSubscriptionId) {
        MercadoPagoClient.MercadoPagoPreapproval preapproval = mercadoPagoClient.getPreapproval(providerSubscriptionId);
        return new SubscriptionSnapshot(
            preapproval.id(),
            preapproval.status(),
            preapproval.amount(),
            preapproval.currency(),
            preapproval.professionalId(),
            preapproval.payerEmail(),
            preapproval.reason()
        );
    }

    /**
     * Cancela subscription respetando reglas de estado.
     */
    public SubscriptionSnapshot cancelSubscription(String providerSubscriptionId) {
        MercadoPagoClient.MercadoPagoPreapproval preapproval =
            mercadoPagoClient.updatePreapprovalStatus(providerSubscriptionId, "cancelled");
        return new SubscriptionSnapshot(
            preapproval.id(),
            preapproval.status(),
            preapproval.amount(),
            preapproval.currency(),
            preapproval.professionalId(),
            preapproval.payerEmail(),
            preapproval.reason()
        );
    }

    /**
     * Resuelve or create plan normalizando entradas, defaults y casos borde.
     */
    private HostedPlanTarget resolveOrCreatePlan(
        SubscriptionPlanCode plan,
        BigDecimal amount,
        String currency,
        String backUrl
    ) {
        String configuredPlanId = billingProperties.resolveMercadoPagoPlanId(plan);
        if (configuredPlanId != null && !configuredPlanId.isBlank()) {
            return new HostedPlanTarget(configuredPlanId, buildHostedPlanCheckoutUrl(configuredPlanId));
        }

        HostedPlanTarget cachedPlan = runtimePlans.get(plan);
        if (cachedPlan != null && cachedPlan.planId() != null && !cachedPlan.planId().isBlank()) {
            return cachedPlan;
        }

        synchronized (runtimePlans) {
            HostedPlanTarget existing = runtimePlans.get(plan);
            if (existing != null && existing.planId() != null && !existing.planId().isBlank()) {
                return existing;
            }

            MercadoPagoClient.MercadoPagoPreapprovalPlan remotePlan = mercadoPagoClient.createPreapprovalPlan(
                new MercadoPagoClient.CreatePreapprovalPlanRequest(
                    "Plura " + plan.name(),
                    backUrl,
                    new MercadoPagoClient.AutoRecurring(
                        1,
                        "months",
                        toNumber(amount),
                        currency
                    ),
                    "active"
                )
            );
            HostedPlanTarget hostedPlan = new HostedPlanTarget(
                remotePlan.id(),
                firstNonBlank(remotePlan.checkoutUrl(), buildHostedPlanCheckoutUrl(remotePlan.id()))
            );
            runtimePlans.put(plan, hostedPlan);
            return hostedPlan;
        }
    }

    /**
     * Resuelve notificacion URL normalizando entradas, defaults y casos borde.
     */
    private String resolveNotificationUrl() {
        String webhookBaseUrl = billingProperties.getWebhookBaseUrl();
        if (webhookBaseUrl != null && !webhookBaseUrl.isBlank()) {
            String base = webhookBaseUrl.endsWith("/") ? webhookBaseUrl.substring(0, webhookBaseUrl.length() - 1) : webhookBaseUrl;
            return base + "/webhooks/mercadopago";
        }
        return null;
    }

    /**
     * Resuelve back URL normalizando entradas, defaults y casos borde.
     */
    private String resolveBackUrl() {
        String explicitBackUrl = billingProperties.getMercadopago().getSubscriptionBackUrl();
        if (explicitBackUrl != null && !explicitBackUrl.isBlank()) {
            return explicitBackUrl;
        }

        BillingProperties.MercadoPago config = billingProperties.getMercadopago();
        if (config.getPendingUrl() != null && !config.getPendingUrl().isBlank()) {
            return config.getPendingUrl();
        }
        if (config.getSuccessUrl() != null && !config.getSuccessUrl().isBlank()) {
            return config.getSuccessUrl();
        }
        if (config.getFailureUrl() != null && !config.getFailureUrl().isBlank()) {
            return config.getFailureUrl();
        }

        throw new ResponseStatusException(
            HttpStatus.SERVICE_UNAVAILABLE,
            "Falta configurar la URL de retorno de Mercado Pago"
        );
    }

    /**
     * Convierte datos internos al formato number esperado por el consumidor.
     */
    private Number toNumber(BigDecimal amount) {
        if (amount == null) {
            return 0;
        }
        if (amount.scale() <= 0) {
            return amount.longValue();
        }
        return amount.doubleValue();
    }

    /**
     * Construye hosted plan checkout URL a partir de datos internos ya validados.
     */
    private String buildHostedPlanCheckoutUrl(String planId) {
        if (planId == null || planId.isBlank()) {
            return null;
        }

        String baseUrl = billingProperties.getMercadopago().getBaseUrl();
        if (baseUrl != null && baseUrl.contains("mercadopago.com")) {
            return "https://www.mercadopago.com/subscriptions/checkout?preapproval_plan_id=" + planId;
        }
        return null;
    }

    /**
     * Obtiene el primer valor util de non blank ignorando nulos o blancos.
     */
    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    /**
     * Crea subscription command validando datos de entrada y persistiendo el resultado.
     */
    public record CreateSubscriptionCommand(
        String localSubscriptionId,
        Long professionalId,
        String payerEmail,
        SubscriptionPlanCode plan,
        BigDecimal amount,
        String currency
    ) {}

    /**
     * Bloque de datos subscription checkout session dentro de la respuesta principal.
     * Agrupa metricas relacionadas para que el frontend no tenga que reconstruirlas.
     */
    public record SubscriptionCheckoutSession(
        String providerSubscriptionId,
        String checkoutUrl,
        String preapprovalPlanId
    ) {}

    /**
     * Bloque de datos subscription snapshot dentro de la respuesta principal.
     * Agrupa metricas relacionadas para que el frontend no tenga que reconstruirlas.
     */
    public record SubscriptionSnapshot(
        String providerSubscriptionId,
        String status,
        BigDecimal amount,
        String currency,
        Long professionalId,
        String payerEmail,
        String reason
    ) {}

    /**
     * Bloque de datos hosted plan target usado internamente por esta clase.
     * Agrupa valores relacionados para que el calculo principal sea mas legible.
     */
    private record HostedPlanTarget(
        String planId,
        String checkoutUrl
    ) {}
}
