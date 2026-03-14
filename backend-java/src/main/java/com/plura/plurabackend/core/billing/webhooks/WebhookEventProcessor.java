package com.plura.plurabackend.core.billing.webhooks;

import com.plura.plurabackend.core.billing.BillingProperties;
import com.plura.plurabackend.core.billing.mercadopago.MercadoPagoSubscriptionService;
import com.plura.plurabackend.core.billing.payments.model.PaymentEvent;
import com.plura.plurabackend.core.billing.payments.model.PaymentProvider;
import com.plura.plurabackend.core.billing.payments.model.PaymentTransaction;
import com.plura.plurabackend.core.billing.payments.model.PaymentTransactionStatus;
import com.plura.plurabackend.core.billing.payments.provider.PaymentProviderClient;
import com.plura.plurabackend.core.billing.payments.provider.ProviderVerificationRequest;
import com.plura.plurabackend.core.billing.payments.provider.ProviderVerificationResult;
import com.plura.plurabackend.core.billing.payments.repository.PaymentEventRepository;
import com.plura.plurabackend.core.billing.payments.repository.PaymentTransactionRepository;
import com.plura.plurabackend.core.billing.subscriptions.model.Subscription;
import com.plura.plurabackend.core.billing.subscriptions.model.SubscriptionPlanCode;
import com.plura.plurabackend.core.billing.subscriptions.model.SubscriptionStatus;
import com.plura.plurabackend.core.billing.subscriptions.repository.SubscriptionRepository;
import com.plura.plurabackend.core.booking.finance.BookingProviderIntegrationService;
import com.plura.plurabackend.core.professional.ProfessionalBillingSubjectGateway;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WebhookEventProcessor {

    private static final Logger LOGGER = LoggerFactory.getLogger(WebhookEventProcessor.class);

    private final PaymentEventRepository paymentEventRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final ProfessionalBillingSubjectGateway professionalBillingSubjectGateway;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final BookingProviderIntegrationService bookingProviderIntegrationService;
    private final BillingProperties billingProperties;
    private final MercadoPagoSubscriptionService mercadoPagoSubscriptionService;
    private final Map<PaymentProvider, PaymentProviderClient> providerClients;

    public WebhookEventProcessor(
        PaymentEventRepository paymentEventRepository,
        SubscriptionRepository subscriptionRepository,
        ProfessionalBillingSubjectGateway professionalBillingSubjectGateway,
        PaymentTransactionRepository paymentTransactionRepository,
        BookingProviderIntegrationService bookingProviderIntegrationService,
        BillingProperties billingProperties,
        MercadoPagoSubscriptionService mercadoPagoSubscriptionService,
        List<PaymentProviderClient> clients
    ) {
        this.paymentEventRepository = paymentEventRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.professionalBillingSubjectGateway = professionalBillingSubjectGateway;
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.bookingProviderIntegrationService = bookingProviderIntegrationService;
        this.billingProperties = billingProperties;
        this.mercadoPagoSubscriptionService = mercadoPagoSubscriptionService;
        Map<PaymentProvider, PaymentProviderClient> mapped = new EnumMap<>(PaymentProvider.class);
        for (PaymentProviderClient client : clients) {
            mapped.put(client.provider(), client);
        }
        this.providerClients = mapped;
    }

    @Transactional
    public void process(String paymentEventId, ParsedWebhookEvent event) {
        PaymentEvent paymentEvent = paymentEventRepository.findById(paymentEventId)
            .orElseThrow(() -> new IllegalStateException("Evento de pago no encontrado"));

        if (bookingProviderIntegrationService.processWebhook(paymentEvent, event)) {
            paymentEvent.setEventType(event.eventType().name());
            paymentEvent.setProcessed(true);
            paymentEvent.setProcessedAt(LocalDateTime.now());
            paymentEvent.setProcessingError(null);
            paymentEventRepository.save(paymentEvent);
            return;
        }

        Map<String, MercadoPagoSubscriptionService.SubscriptionSnapshot> snapshotCache = new HashMap<>();
        ProfessionalProfile professional = resolveProfessional(event, snapshotCache);
        Subscription subscription = resolveSubscription(event, professional);

        if (professional == null && event.eventType() != WebhookEventType.UNKNOWN) {
            LOGGER.warn("Webhook event {} ({}) no pudo resolver professional. providerSubscriptionId={}",
                paymentEventId, event.eventType(), event.providerSubscriptionId());
        }

        if (event.eventType() != WebhookEventType.UNKNOWN && subscription != null) {
            validateExpectedSubscriptionData(subscription, event);
            verifyAgainstProvider(subscription, event, professional, snapshotCache);
            applySubscriptionState(subscription, event, snapshotCache);
            subscription = subscriptionRepository.save(subscription);
            createOrUpdateTransaction(event, subscription, professional);
        }

        paymentEvent.setEventType(event.eventType().name());
        paymentEvent.setProfessionalId(professional == null ? null : professional.getId());
        paymentEvent.setProcessed(true);
        paymentEvent.setProcessedAt(LocalDateTime.now());
        paymentEvent.setProcessingError(null);
        paymentEventRepository.save(paymentEvent);
    }

    private MercadoPagoSubscriptionService.SubscriptionSnapshot getCachedSnapshot(
        String providerSubscriptionId,
        Map<String, MercadoPagoSubscriptionService.SubscriptionSnapshot> cache
    ) {
        return cache.computeIfAbsent(providerSubscriptionId,
            mercadoPagoSubscriptionService::getSubscription);
    }

    private ProfessionalProfile resolveProfessional(
        ParsedWebhookEvent event,
        Map<String, MercadoPagoSubscriptionService.SubscriptionSnapshot> snapshotCache
    ) {
        if (event.professionalId() != null) {
            return professionalBillingSubjectGateway.findById(event.professionalId()).orElse(null);
        }

        if (event.providerSubscriptionId() != null && !event.providerSubscriptionId().isBlank()) {
            ProfessionalProfile professional = subscriptionRepository.findByProviderAndProviderSubscriptionId(
                event.provider(),
                event.providerSubscriptionId()
            ).flatMap(subscription -> professionalBillingSubjectGateway.findById(subscription.getProfessionalId())).orElse(null);
            if (professional != null) {
                return professional;
            }

            if (event.provider() == PaymentProvider.MERCADOPAGO) {
                MercadoPagoSubscriptionService.SubscriptionSnapshot snapshot =
                    getCachedSnapshot(event.providerSubscriptionId(), snapshotCache);
                if (snapshot.professionalId() != null) {
                    return professionalBillingSubjectGateway.findById(snapshot.professionalId()).orElse(null);
                }
                if (snapshot.payerEmail() != null && !snapshot.payerEmail().isBlank()) {
                    return professionalBillingSubjectGateway.findByEmailIgnoreCase(snapshot.payerEmail()).orElse(null);
                }
            }
        }

        return null;
    }

    private Subscription resolveSubscription(ParsedWebhookEvent event, ProfessionalProfile professional) {
        Subscription subscription = null;
        if (event.providerSubscriptionId() != null && !event.providerSubscriptionId().isBlank()) {
            subscription = subscriptionRepository.findByProviderAndProviderSubscriptionIdForUpdate(
                event.provider(),
                event.providerSubscriptionId()
            ).orElse(null);
        }

        if (subscription == null && professional != null) {
            subscription = subscriptionRepository.findByProfessionalIdForUpdate(professional.getId()).orElse(null);
        }

        if (subscription != null) {
            return subscription;
        }

        if (professional == null) {
            return null;
        }

        SubscriptionPlanCode plan = resolvePlan(event.planCode());
        if (plan == null) {
            throw new IllegalStateException("Evento no contiene plan para crear suscripción");
        }
        BillingProperties.PlanConfig planConfig = billingProperties.resolvePlan(plan);

        Subscription created = new Subscription();
        created.setProfessionalId(professional.getId());
        created.setPlan(plan);
        created.setProvider(event.provider());
        created.setStatus(SubscriptionStatus.TRIAL);
        created.setPlanAmount(planConfig.getPrice());
        created.setCurrency(planConfig.getCurrency());
        created.setExpectedAmount(planConfig.getPrice());
        created.setExpectedCurrency(planConfig.getCurrency());
        created.setCancelAtPeriodEnd(false);
        created.setProviderSubscriptionId(event.providerSubscriptionId());

        return created;
    }

    private void verifyAgainstProvider(
        Subscription subscription,
        ParsedWebhookEvent event,
        ProfessionalProfile professional,
        Map<String, MercadoPagoSubscriptionService.SubscriptionSnapshot> snapshotCache
    ) {
        if (!billingProperties.isProviderVerificationEnabled()) {
            return;
        }
        if (event.eventType() != WebhookEventType.PAYMENT_SUCCEEDED
            && event.eventType() != WebhookEventType.SUBSCRIPTION_RENEWED) {
            return;
        }

        if (event.provider() == PaymentProvider.MERCADOPAGO) {
            verifyMercadoPagoSubscription(subscription, event, professional, snapshotCache);
            return;
        }

        PaymentProviderClient client = providerClients.get(event.provider());
        if (client == null) {
            throw new IllegalStateException("No hay cliente PSP para provider " + event.provider().name());
        }

        Long expectedProfessionalId = professional == null ? null : professional.getId();
        ProviderVerificationResult verification = client.verifyPayment(
            new ProviderVerificationRequest(
                event.providerPaymentId(),
                event.providerSubscriptionId(),
                subscription.getExpectedAmount(),
                subscription.getExpectedCurrency(),
                expectedProfessionalId
            )
        );

        if (!verification.finalApproved()) {
            throw new IllegalStateException(
                "Pago no aprobado por PSP. status=" + verification.status()
            );
        }

        if (expectedProfessionalId != null && verification.professionalId() != null
            && !expectedProfessionalId.equals(verification.professionalId())) {
            throw new IllegalStateException("professionalId no coincide con PSP");
        }

        if (subscription.getExpectedAmount() != null && verification.amount() != null
            && verification.amount().compareTo(subscription.getExpectedAmount()) != 0) {
            throw new IllegalStateException("amount no coincide con expectedAmount");
        }

        if (subscription.getExpectedCurrency() != null
            && verification.currency() != null
            && !subscription.getExpectedCurrency().equalsIgnoreCase(verification.currency())) {
            throw new IllegalStateException("currency no coincide con expectedCurrency");
        }

        if (verification.planCode() != null && !verification.planCode().isBlank()
            && subscription.getPlan() != null
            && subscription.getPlan() != SubscriptionPlanCode.fromCode(verification.planCode())) {
            throw new IllegalStateException("planCode no coincide con suscripción esperada");
        }
    }

    private void verifyMercadoPagoSubscription(
        Subscription subscription,
        ParsedWebhookEvent event,
        ProfessionalProfile professional,
        Map<String, MercadoPagoSubscriptionService.SubscriptionSnapshot> snapshotCache
    ) {
        String providerSubscriptionId = event.providerSubscriptionId();
        if (providerSubscriptionId == null || providerSubscriptionId.isBlank()) {
            throw new IllegalStateException("subscription_authorized_payment requiere providerSubscriptionId");
        }

        MercadoPagoSubscriptionService.SubscriptionSnapshot snapshot =
            getCachedSnapshot(providerSubscriptionId, snapshotCache);

        String status = snapshot.status() == null ? "" : snapshot.status().trim().toLowerCase(Locale.ROOT);
        if (!"authorized".equals(status) && !"active".equals(status)) {
            throw new IllegalStateException("Suscripcion no autorizada en Mercado Pago. status=" + snapshot.status());
        }

        Long expectedProfessionalId = professional == null ? null : professional.getId();
        if (expectedProfessionalId != null && snapshot.professionalId() != null
            && !expectedProfessionalId.equals(snapshot.professionalId())) {
            throw new IllegalStateException("professionalId no coincide con PSP");
        }

        if (subscription.getExpectedAmount() != null && snapshot.amount() != null
            && snapshot.amount().compareTo(subscription.getExpectedAmount()) != 0) {
            throw new IllegalStateException("amount no coincide con expectedAmount");
        }

        if (subscription.getExpectedCurrency() != null
            && snapshot.currency() != null
            && !subscription.getExpectedCurrency().equalsIgnoreCase(snapshot.currency())) {
            throw new IllegalStateException("currency no coincide con expectedCurrency");
        }
    }

    private void validateExpectedSubscriptionData(Subscription subscription, ParsedWebhookEvent event) {
        if (event.planCode() != null && !event.planCode().isBlank()
            && subscription.getPlan() != null
            && subscription.getPlan() != SubscriptionPlanCode.fromCode(event.planCode())) {
            throw new IllegalStateException("planCode de webhook no coincide con suscripción");
        }

        if (event.amount() != null && subscription.getExpectedAmount() != null
            && event.amount().compareTo(subscription.getExpectedAmount()) != 0) {
            throw new IllegalStateException("amount de webhook no coincide con expectedAmount");
        }

        if (event.currency() != null && !event.currency().isBlank()
            && subscription.getExpectedCurrency() != null && !subscription.getExpectedCurrency().isBlank()
            && !subscription.getExpectedCurrency().equalsIgnoreCase(event.currency())) {
            throw new IllegalStateException("currency de webhook no coincide con expectedCurrency");
        }
    }

    private void applySubscriptionState(
        Subscription subscription,
        ParsedWebhookEvent event,
        Map<String, MercadoPagoSubscriptionService.SubscriptionSnapshot> snapshotCache
    ) {
        if (event.providerSubscriptionId() != null && !event.providerSubscriptionId().isBlank()) {
            subscription.setProviderSubscriptionId(event.providerSubscriptionId());
        }
        subscription.setProvider(event.provider());

        SubscriptionPlanCode plan = resolvePlan(event.planCode());
        if (plan != null) {
            subscription.setPlan(plan);
            BillingProperties.PlanConfig planConfig = billingProperties.resolvePlan(plan);
            subscription.setPlanAmount(planConfig.getPrice());
            subscription.setCurrency(planConfig.getCurrency());
            if (subscription.getExpectedAmount() == null) {
                subscription.setExpectedAmount(planConfig.getPrice());
            }
            if (subscription.getExpectedCurrency() == null || subscription.getExpectedCurrency().isBlank()) {
                subscription.setExpectedCurrency(planConfig.getCurrency());
            }
        }

        LocalDateTime effectiveTime = event.eventTime() != null ? event.eventTime() : LocalDateTime.now();

        switch (event.eventType()) {
            case SUBSCRIPTION_PENDING -> {
                subscription.setStatus(SubscriptionStatus.TRIAL);
                subscription.setCancelAtPeriodEnd(false);
            }
            case PAYMENT_SUCCEEDED, SUBSCRIPTION_RENEWED -> {
                subscription.setStatus(resolveActiveOrPastDueStatus(event, snapshotCache));
                subscription.setCurrentPeriodStart(effectiveTime);
                subscription.setCurrentPeriodEnd(effectiveTime.plusMonths(1));
                subscription.setCancelAtPeriodEnd(false);
            }
            case PAYMENT_FAILED -> subscription.setStatus(SubscriptionStatus.PAST_DUE);
            case SUBSCRIPTION_CANCELLED -> {
                if (event.cancelAtPeriodEnd()) {
                    subscription.setCancelAtPeriodEnd(true);
                } else {
                    subscription.setStatus(SubscriptionStatus.CANCELLED);
                    subscription.setCancelAtPeriodEnd(false);
                    subscription.setCurrentPeriodEnd(effectiveTime);
                }
            }
            case PAYMENT_REFUNDED, REFUND_PARTIAL -> subscription.setStatus(SubscriptionStatus.PAST_DUE);
            case REFUND_FAILED, PAYOUT_PENDING, PAYOUT_SUCCEEDED, PAYOUT_FAILED, UNKNOWN -> {
                // Evento reconocido pero sin impacto en estado de suscripción.
            }
        }
    }

    private void createOrUpdateTransaction(
        ParsedWebhookEvent event,
        Subscription subscription,
        ProfessionalProfile professional
    ) {
        if (professional == null) {
            return;
        }

        String providerPaymentId = event.providerPaymentId() != null
            ? event.providerPaymentId()
            : event.providerObjectId();

        PaymentTransaction transaction;
        if (providerPaymentId != null && !providerPaymentId.isBlank()) {
            transaction = paymentTransactionRepository.findByProviderAndProviderPaymentId(
                event.provider(),
                providerPaymentId
            ).orElseGet(PaymentTransaction::new);
            transaction.setProviderPaymentId(providerPaymentId);
        } else {
            transaction = new PaymentTransaction();
        }

        transaction.setProfessionalId(professional.getId());
        transaction.setSubscription(subscription);
        transaction.setProvider(event.provider());
        transaction.setAmount(resolveAmount(event.amount(), subscription));
        transaction.setCurrency(resolveCurrency(event.currency(), subscription));
        transaction.setStatus(mapTransactionStatus(event.eventType()));
        paymentTransactionRepository.save(transaction);
    }

    private BigDecimal resolveAmount(BigDecimal amountFromEvent, Subscription subscription) {
        if (amountFromEvent != null) {
            return amountFromEvent;
        }
        if (subscription != null && subscription.getPlanAmount() != null) {
            return subscription.getPlanAmount();
        }
        return BigDecimal.ZERO;
    }

    private String resolveCurrency(String currencyFromEvent, Subscription subscription) {
        if (currencyFromEvent != null && !currencyFromEvent.isBlank()) {
            return currencyFromEvent;
        }
        if (subscription != null && subscription.getCurrency() != null && !subscription.getCurrency().isBlank()) {
            return subscription.getCurrency();
        }
        if (subscription != null && subscription.getExpectedCurrency() != null && !subscription.getExpectedCurrency().isBlank()) {
            return subscription.getExpectedCurrency().toUpperCase(Locale.ROOT);
        }
        return "UYU";
    }

    private PaymentTransactionStatus mapTransactionStatus(WebhookEventType eventType) {
        return switch (eventType) {
            case SUBSCRIPTION_PENDING -> PaymentTransactionStatus.PENDING;
            case PAYMENT_SUCCEEDED, SUBSCRIPTION_RENEWED -> PaymentTransactionStatus.APPROVED;
            case PAYMENT_FAILED -> PaymentTransactionStatus.FAILED;
            case SUBSCRIPTION_CANCELLED -> PaymentTransactionStatus.CANCELLED;
            case PAYMENT_REFUNDED -> PaymentTransactionStatus.REFUNDED;
            case REFUND_PARTIAL -> PaymentTransactionStatus.PARTIALLY_REFUNDED;
            case REFUND_FAILED -> PaymentTransactionStatus.FAILED;
            case PAYOUT_PENDING -> PaymentTransactionStatus.PENDING;
            case PAYOUT_SUCCEEDED -> PaymentTransactionStatus.APPROVED;
            case PAYOUT_FAILED -> PaymentTransactionStatus.FAILED;
            case UNKNOWN -> PaymentTransactionStatus.PENDING;
        };
    }

    private SubscriptionStatus resolveActiveOrPastDueStatus(
        ParsedWebhookEvent event,
        Map<String, MercadoPagoSubscriptionService.SubscriptionSnapshot> snapshotCache
    ) {
        if (event.provider() != PaymentProvider.MERCADOPAGO || event.providerSubscriptionId() == null) {
            return SubscriptionStatus.ACTIVE;
        }

        MercadoPagoSubscriptionService.SubscriptionSnapshot snapshot =
            getCachedSnapshot(event.providerSubscriptionId(), snapshotCache);
        String status = snapshot.status() == null ? "" : snapshot.status().trim().toLowerCase(Locale.ROOT);
        return switch (status) {
            case "authorized", "active" -> SubscriptionStatus.ACTIVE;
            case "paused" -> SubscriptionStatus.PAST_DUE;
            case "cancelled", "canceled" -> SubscriptionStatus.CANCELLED;
            default -> SubscriptionStatus.ACTIVE;
        };
    }

    private SubscriptionPlanCode resolvePlan(String planCode) {
        if (planCode == null || planCode.isBlank()) {
            return null;
        }
        try {
            return SubscriptionPlanCode.fromCode(planCode);
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }
}
