package com.plura.plurabackend.core.booking.finance;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.billing.BillingProperties;
import com.plura.plurabackend.core.billing.payments.model.PaymentEvent;
import com.plura.plurabackend.core.billing.payments.model.PaymentProvider;
import com.plura.plurabackend.core.billing.payments.model.PaymentTransaction;
import com.plura.plurabackend.core.billing.payments.model.PaymentTransactionStatus;
import com.plura.plurabackend.core.billing.payments.model.PaymentTransactionType;
import com.plura.plurabackend.core.billing.payments.provider.BookingProviderCheckoutRequest;
import com.plura.plurabackend.core.billing.payments.provider.PaymentProviderClient;
import com.plura.plurabackend.core.billing.payments.provider.ProviderCheckoutSession;
import com.plura.plurabackend.core.billing.payments.provider.ProviderPayoutRequest;
import com.plura.plurabackend.core.billing.payments.provider.ProviderPayoutResult;
import com.plura.plurabackend.core.billing.payments.provider.ProviderRefundRequest;
import com.plura.plurabackend.core.billing.payments.provider.ProviderRefundResult;
import com.plura.plurabackend.core.billing.payments.provider.ProviderVerificationRequest;
import com.plura.plurabackend.core.billing.payments.provider.ProviderVerificationResult;
import com.plura.plurabackend.core.billing.payments.repository.PaymentTransactionRepository;
import com.plura.plurabackend.core.billing.providerops.ProviderOperationService;
import com.plura.plurabackend.core.billing.providerops.ProviderOperationWorker;
import com.plura.plurabackend.core.billing.providerops.model.ProviderOperation;
import com.plura.plurabackend.core.billing.providerops.model.ProviderOperationStatus;
import com.plura.plurabackend.core.billing.providerops.model.ProviderOperationType;
import com.plura.plurabackend.core.billing.webhooks.ParsedWebhookEvent;
import com.plura.plurabackend.core.billing.webhooks.WebhookEventDomain;
import com.plura.plurabackend.core.billing.webhooks.WebhookEventType;
import com.plura.plurabackend.core.booking.bridge.BookingProfessionalPlanGateway;
import com.plura.plurabackend.core.booking.dto.BookingPaymentSessionRequest;
import com.plura.plurabackend.core.booking.dto.BookingPaymentSessionResponse;
import com.plura.plurabackend.core.booking.event.BookingEventService;
import com.plura.plurabackend.core.booking.event.model.BookingActorType;
import com.plura.plurabackend.core.booking.event.model.BookingEventType;
import com.plura.plurabackend.core.booking.finance.model.BookingFinancialSummary;
import com.plura.plurabackend.core.booking.finance.model.BookingPayoutRecord;
import com.plura.plurabackend.core.booking.finance.model.BookingPayoutStatus;
import com.plura.plurabackend.core.booking.finance.model.BookingRefundRecord;
import com.plura.plurabackend.core.booking.finance.model.BookingRefundStatus;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.core.booking.model.ServicePaymentType;
import com.plura.plurabackend.core.notification.integration.billing.BillingNotificationIntegrationService;
import com.plura.plurabackend.core.notification.integration.booking.BookingNotificationIntegrationService;
import com.plura.plurabackend.core.booking.repository.BookingRepository;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.model.UserRole;
import com.plura.plurabackend.core.user.repository.UserRepository;
import com.plura.plurabackend.professional.application.ProfessionalSideEffectCoordinator;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.dao.ConcurrencyFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BookingProviderIntegrationService {

    private static final Logger LOGGER = LoggerFactory.getLogger(BookingProviderIntegrationService.class);

    private final BookingRepository bookingRepository;
    private final ProfessionalProfileRepository professionalProfileRepository;
    private final ProfessionalSideEffectCoordinator sideEffectCoordinator;
    private final UserRepository userRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final BookingFinanceService bookingFinanceService;
    private final BookingEventService bookingEventService;
    private final BookingMoneyResolver bookingMoneyResolver;
    private final ProviderOperationService providerOperationService;
    private final ProviderOperationWorker providerOperationWorker;
    private final BillingProperties billingProperties;
    private final ObjectMapper objectMapper;
    private final BookingProfessionalPlanGateway bookingProfessionalPlanGateway;
    private final BillingNotificationIntegrationService billingNotificationIntegrationService;
    private final BookingNotificationIntegrationService bookingNotificationIntegrationService;
    private final Map<PaymentProvider, PaymentProviderClient> providerClients;
    private final TransactionTemplate requiresNewTransaction;

    @Autowired
    public BookingProviderIntegrationService(
        BookingRepository bookingRepository,
        ProfessionalProfileRepository professionalProfileRepository,
        ProfessionalSideEffectCoordinator sideEffectCoordinator,
        UserRepository userRepository,
        PaymentTransactionRepository paymentTransactionRepository,
        BookingFinanceService bookingFinanceService,
        BookingEventService bookingEventService,
        BookingMoneyResolver bookingMoneyResolver,
        ProviderOperationService providerOperationService,
        @Lazy ProviderOperationWorker providerOperationWorker,
        PlatformTransactionManager transactionManager,
        BillingProperties billingProperties,
        ObjectMapper objectMapper,
        BookingProfessionalPlanGateway bookingProfessionalPlanGateway,
        BillingNotificationIntegrationService billingNotificationIntegrationService,
        BookingNotificationIntegrationService bookingNotificationIntegrationService,
        List<PaymentProviderClient> clients
    ) {
        this.bookingRepository = bookingRepository;
        this.professionalProfileRepository = professionalProfileRepository;
        this.sideEffectCoordinator = sideEffectCoordinator;
        this.userRepository = userRepository;
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.bookingFinanceService = bookingFinanceService;
        this.bookingEventService = bookingEventService;
        this.bookingMoneyResolver = bookingMoneyResolver;
        this.providerOperationService = providerOperationService;
        this.providerOperationWorker = providerOperationWorker;
        this.billingProperties = billingProperties;
        this.objectMapper = objectMapper;
        this.bookingProfessionalPlanGateway = bookingProfessionalPlanGateway;
        this.billingNotificationIntegrationService = billingNotificationIntegrationService;
        this.bookingNotificationIntegrationService = bookingNotificationIntegrationService;
        this.requiresNewTransaction = new TransactionTemplate(transactionManager);
        this.requiresNewTransaction.setPropagationBehavior(org.springframework.transaction.TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        Map<PaymentProvider, PaymentProviderClient> mapped = new EnumMap<>(PaymentProvider.class);
        for (PaymentProviderClient client : clients) {
            mapped.put(client.provider(), client);
        }
        this.providerClients = mapped;
    }

    @Transactional
    public BookingPaymentSessionResponse createPaymentSessionForClient(
        String rawUserId,
        Long bookingId,
        BookingPaymentSessionRequest request
    ) {
        User user = loadClient(rawUserId);
        Booking booking = bookingRepository.findDetailedByIdForUpdate(bookingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva no encontrada"));
        if (booking.getUser() == null || !user.getId().equals(booking.getUser().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado");
        }
        if (booking.getOperationalStatus() != BookingOperationalStatus.PENDING
            && booking.getOperationalStatus() != BookingOperationalStatus.CONFIRMED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La reserva no admite cobro en su estado actual");
        }

        BigDecimal amount = bookingMoneyResolver.resolvePrepaidAmount(booking);
        if (amount.signum() <= 0 || booking.getServicePaymentTypeSnapshot() == ServicePaymentType.ON_SITE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La reserva no requiere pago anticipado");
        }
        Long professionalId = booking.getProfessionalId();
        if (!bookingProfessionalPlanGateway.allowsOnlinePayments(professionalId)) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Tu plan no permite pagos online"
            );
        }

        syncPendingChargeStatus(booking);

        PaymentTransaction existingApproved = findLatestBookingTransaction(
            bookingId,
            PaymentTransactionType.BOOKING_CHARGE,
            List.of(
                PaymentTransactionStatus.APPROVED,
                PaymentTransactionStatus.PARTIALLY_REFUNDED,
                PaymentTransactionStatus.REFUNDED
            ),
            "existing_approved_charge_lookup"
        );
        if (existingApproved != null) {
            BookingFinancialSummary summary = bookingFinanceService.ensureInitializedWithEvidence(booking);
            return new BookingPaymentSessionResponse(
                booking.getId(),
                existingApproved.getId(),
                existingApproved.getProvider().name(),
                null,
                existingApproved.getAmount(),
                existingApproved.getCurrency(),
                summary.getFinancialStatus().name()
            );
        }

        PaymentTransaction existingPending = findLatestBookingTransaction(
            bookingId,
            PaymentTransactionType.BOOKING_CHARGE,
            List.of(PaymentTransactionStatus.PENDING),
            "existing_pending_charge_lookup"
        );
        if (existingPending != null) {
            if (isLegacyReadOnlyProvider(existingPending.getProvider())) {
                ProviderCheckoutSession session = recreatePendingCheckout(existingPending, booking, user);
                BookingFinancialSummary summary = bookingFinanceService.ensureInitializedWithEvidence(booking);
                return new BookingPaymentSessionResponse(
                    booking.getId(),
                    existingPending.getId(),
                    existingPending.getProvider() == null ? null : existingPending.getProvider().name(),
                    session.checkoutUrl(),
                    existingPending.getAmount(),
                    existingPending.getCurrency(),
                    summary.getFinancialStatus().name()
                );
            }
            String checkoutUrl = extractCheckoutUrl(existingPending);
            if (checkoutUrl == null || checkoutUrl.isBlank()) {
                ProviderCheckoutSession session = recreatePendingCheckout(existingPending, booking, user);
                BookingFinancialSummary summary = bookingFinanceService.ensureInitializedWithEvidence(booking);
                return new BookingPaymentSessionResponse(
                    booking.getId(),
                    existingPending.getId(),
                    existingPending.getProvider() == null ? null : existingPending.getProvider().name(),
                    session.checkoutUrl(),
                    existingPending.getAmount(),
                    existingPending.getCurrency(),
                    summary.getFinancialStatus().name()
                );
            }
            BookingFinancialSummary summary = bookingFinanceService.ensureInitializedWithEvidence(booking);
            return new BookingPaymentSessionResponse(
                booking.getId(),
                existingPending.getId(),
                existingPending.getProvider() == null ? null : existingPending.getProvider().name(),
                checkoutUrl,
                existingPending.getAmount(),
                existingPending.getCurrency(),
                summary.getFinancialStatus().name()
            );
        }

        PaymentProvider provider = resolveProvider(request == null ? null : request.getProvider());

        PaymentTransaction transaction = new PaymentTransaction();
        transaction.setProfessionalId(booking.getProfessionalId());
        transaction.setBooking(booking);
        transaction.setProvider(provider);
        transaction.setTransactionType(PaymentTransactionType.BOOKING_CHARGE);
        transaction.setAmount(amount);
        transaction.setCurrency(bookingMoneyResolver.resolveCurrency(booking));
        transaction.setStatus(PaymentTransactionStatus.PENDING);
        transaction.setExternalReference("booking:" + booking.getId());
        transaction = paymentTransactionRepository.saveAndFlush(transaction);

        ProviderOperation operation = providerOperationService.createOrReuseOperation(
            ProviderOperationType.BOOKING_CHECKOUT,
            provider,
            booking.getId(),
            transaction.getId(),
            null,
            null,
            transaction.getExternalReference(),
            writeJson(Map.of(
                "bookingId", booking.getId(),
                "transactionId", transaction.getId(),
                "provider", provider.name(),
                "amount", amount,
                "currency", transaction.getCurrency()
            ))
        );
        BookingFinancialSummary summary = bookingFinanceService.ensureInitializedWithEvidence(booking);

        ProviderCheckoutSession checkoutSession;
        try {
            PaymentProviderClient client = resolveProviderClient(provider);
            checkoutSession = client.createBookingCheckout(
                new BookingProviderCheckoutRequest(
                    transaction.getId(),
                    booking.getId(),
                    booking.getProfessionalId(),
                    transaction.getAmount(),
                    transaction.getCurrency(),
                    user == null ? null : user.getEmail(),
                    user == null ? null : user.getFullName(),
                    buildBookingDescription(booking),
                    null,
                    resolveWebhookUrl(provider),
                    provider
                )
            );
        } catch (RuntimeException exception) {
            LOGGER.warn(
                "Checkout creation failed for new booking payment session bookingId={} transactionId={} operationId={} provider={}",
                booking.getId(),
                transaction.getId(),
                operation.getId(),
                provider,
                exception
            );
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "No se pudo iniciar checkout de reserva", exception);
        }
        transaction.setProviderPaymentId(null);
        transaction.setProviderStatus("CHECKOUT_CREATED");
        transaction.setPayloadJson(writeCheckoutPayload(transaction, checkoutSession, booking, null));
        paymentTransactionRepository.save(transaction);
        bookingFinanceService.applyExternalPaymentEvidence(booking, transaction);
        operation.setStatus(ProviderOperationStatus.SUCCEEDED);
        operation.setProviderReference(checkoutSession.providerSubscriptionId());
        operation.setResponsePayloadJson(writeJson(checkoutSession));
        operation.setCompletedAt(LocalDateTime.now());
        operation.setNextAttemptAt(null);
        operation.setLastError(null);
        operation.setLockedBy(null);
        operation.setLockedAt(null);
        operation.setLeaseUntil(null);

        return new BookingPaymentSessionResponse(
            booking.getId(),
            transaction.getId(),
            provider.name(),
            checkoutSession.checkoutUrl(),
            amount,
            transaction.getCurrency(),
            summary.getFinancialStatus().name()
        );
    }

    @Transactional
    public BookingFinanceDispatchPlan processPostDecision(
        Booking booking,
        BookingFinanceUpdateResult financeResult
    ) {
        if (financeResult == null) {
            return new BookingFinanceDispatchPlan(null, List.of());
        }

        BookingFinanceUpdateResult current = financeResult;
        java.util.List<String> operationIds = new java.util.ArrayList<>();
        if (current.refundRecord() != null) {
            BookingFinanceDispatchPlan refundPlan = initiateBookingRefund(booking, current.refundRecord(), current.payoutRecord(), false);
            current = refundPlan.localResult();
            operationIds.addAll(refundPlan.providerOperationIds());
        }
        if (current.payoutRecord() != null && isRefundSettled(current.refundRecord())) {
            BookingFinanceDispatchPlan payoutPlan = initiateBookingPayout(booking, current.payoutRecord(), current.refundRecord(), false);
            current = payoutPlan.localResult();
            operationIds.addAll(payoutPlan.providerOperationIds());
        }
        return new BookingFinanceDispatchPlan(current, operationIds);
    }

    @Transactional
    public BookingFinanceDispatchPlan retryRefund(
        Booking booking,
        BookingRefundRecord refundRecord
    ) {
        if (refundRecord == null) {
            BookingFinancialSummary summary = bookingFinanceService.ensureInitializedWithEvidence(booking);
            return new BookingFinanceDispatchPlan(new BookingFinanceUpdateResult(summary, null, null), List.of());
        }
        if (!isRefundSettled(refundRecord) && refundRecord.getStatus() != BookingRefundStatus.FAILED) {
            BookingFinancialSummary summary = bookingFinanceService.applyRefundEvidence(booking, refundRecord);
            return new BookingFinanceDispatchPlan(new BookingFinanceUpdateResult(summary, refundRecord, null), List.of());
        }
        if (refundRecord.getStatus() != BookingRefundStatus.PENDING_MANUAL) {
            if (refundRecord.getStatus() != BookingRefundStatus.FAILED) {
                BookingFinancialSummary summary = bookingFinanceService.applyRefundEvidence(booking, refundRecord);
                return new BookingFinanceDispatchPlan(new BookingFinanceUpdateResult(summary, refundRecord, null), List.of());
            }
        }
        return initiateBookingRefund(booking, refundRecord, null, true);
    }

    private BookingFinanceDispatchPlan initiateBookingRefund(
        Booking booking,
        BookingRefundRecord refundRecord,
        BookingPayoutRecord payoutRecord,
        boolean manualRetry
    ) {
        if (refundRecord == null) {
            BookingFinancialSummary summary = bookingFinanceService.ensureInitializedWithEvidence(booking);
            return new BookingFinanceDispatchPlan(new BookingFinanceUpdateResult(summary, null, payoutRecord), List.of());
        }
        if (!manualRetry && refundRecord.getStatus() != BookingRefundStatus.PENDING_MANUAL) {
            BookingFinancialSummary summary = bookingFinanceService.applyRefundEvidence(booking, refundRecord);
            return new BookingFinanceDispatchPlan(new BookingFinanceUpdateResult(summary, refundRecord, payoutRecord), List.of());
        }
        PaymentTransaction chargeTransaction = findLatestBookingTransaction(
            booking.getId(),
            PaymentTransactionType.BOOKING_CHARGE,
            List.of(
                PaymentTransactionStatus.APPROVED,
                PaymentTransactionStatus.PARTIALLY_REFUNDED,
                PaymentTransactionStatus.REFUNDED
            ),
            "refund_charge_lookup"
        );
        if (chargeTransaction == null || chargeTransaction.getProvider() == null
            || chargeTransaction.getProviderPaymentId() == null || chargeTransaction.getProviderPaymentId().isBlank()) {
            BookingFinancialSummary summary = bookingFinanceService.applyRefundEvidence(booking, refundRecord);
            return new BookingFinanceDispatchPlan(new BookingFinanceUpdateResult(summary, refundRecord, payoutRecord), List.of());
        }

        if (providerClients.get(chargeTransaction.getProvider()) == null) {
            BookingFinancialSummary summary = bookingFinanceService.applyRefundEvidence(booking, refundRecord);
            return new BookingFinanceDispatchPlan(new BookingFinanceUpdateResult(summary, refundRecord, payoutRecord), List.of());
        }

        PaymentTransaction existingRefundTx = paymentTransactionRepository.findTopByRefundRecord_IdOrderByCreatedAtDesc(refundRecord.getId())
            .orElse(null);
        if (existingRefundTx != null && !manualRetry) {
            BookingFinancialSummary summary = bookingFinanceService.applyRefundEvidence(booking, refundRecord);
            return new BookingFinanceDispatchPlan(new BookingFinanceUpdateResult(summary, refundRecord, payoutRecord), List.of());
        }
        if (existingRefundTx != null && manualRetry
            && (existingRefundTx.getStatus() == PaymentTransactionStatus.PENDING
                || existingRefundTx.getStatus() == PaymentTransactionStatus.APPROVED
                || existingRefundTx.getStatus() == PaymentTransactionStatus.PARTIALLY_REFUNDED
                || existingRefundTx.getStatus() == PaymentTransactionStatus.REFUNDED)) {
            BookingFinancialSummary summary = bookingFinanceService.applyRefundEvidence(booking, refundRecord);
            return new BookingFinanceDispatchPlan(new BookingFinanceUpdateResult(summary, refundRecord, payoutRecord), List.of());
        }

        PaymentTransaction refundTx = existingRefundTx == null ? new PaymentTransaction() : existingRefundTx;
        refundTx.setProfessionalId(booking.getProfessionalId());
        refundTx.setBooking(booking);
        refundTx.setRefundRecord(refundRecord);
        refundTx.setProvider(chargeTransaction.getProvider());
        refundTx.setTransactionType(PaymentTransactionType.BOOKING_REFUND);
        refundTx.setExternalReference("refund:" + refundRecord.getId());
        refundTx.setAmount(refundRecord.getTargetAmount());
        refundTx.setCurrency(refundRecord.getCurrency());
        refundTx.setStatus(PaymentTransactionStatus.PENDING);
        refundTx.setFailedAt(null);
        refundTx.setApprovedAt(null);
        refundTx.setPayloadJson(writeJson(Map.of(
            "source", manualRetry ? "refund_retry_intent" : "refund_intent",
            "bookingId", booking.getId(),
            "refundRecordId", refundRecord.getId(),
            "chargeProviderPaymentId", chargeTransaction.getProviderPaymentId()
        )));
        refundTx = paymentTransactionRepository.saveAndFlush(refundTx);

        ProviderOperation operation = providerOperationService.createOrReuseOperation(
            ProviderOperationType.BOOKING_REFUND,
            chargeTransaction.getProvider(),
            booking.getId(),
            refundTx.getId(),
            refundRecord.getId(),
            null,
            refundTx.getExternalReference(),
            writeJson(Map.of(
                "bookingId", booking.getId(),
                "refundRecordId", refundRecord.getId(),
                "transactionId", refundTx.getId(),
                "manualRetry", manualRetry
            ))
        );

        BookingRefundRecord updatedRefund = bookingFinanceService.markRefundRecordPendingProvider(refundRecord.getId(), refundTx.getProviderPaymentId());
        BookingFinancialSummary summary = bookingFinanceService.applyRefundEvidence(booking, updatedRefund);
        return new BookingFinanceDispatchPlan(
            new BookingFinanceUpdateResult(summary, updatedRefund, payoutRecord),
            List.of(operation.getId())
        );
    }

    @Transactional
    public BookingFinanceDispatchPlan retryPayout(
        Booking booking,
        BookingPayoutRecord payoutRecord
    ) {
        if (payoutRecord == null) {
            BookingFinancialSummary summary = bookingFinanceService.ensureInitializedWithEvidence(booking);
            return new BookingFinanceDispatchPlan(new BookingFinanceUpdateResult(summary, null, null), List.of());
        }
        BookingRefundRecord latestRefundRecord = bookingFinanceService.findLatestRefundRecord(booking.getId());
        if (!isRefundSettled(latestRefundRecord)) {
            BookingFinancialSummary summary = bookingFinanceService.ensureInitializedWithEvidence(booking);
            return new BookingFinanceDispatchPlan(new BookingFinanceUpdateResult(summary, latestRefundRecord, payoutRecord), List.of());
        }
        return initiateBookingPayout(booking, payoutRecord, null, true);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean syncPendingChargeStatus(Long bookingId) {
        Booking booking = bookingRepository.findDetailedById(bookingId).orElse(null);
        if (booking == null) {
            return false;
        }
        try {
            return syncPendingChargeStatus(booking);
        } catch (ConcurrencyFailureException exception) {
            LOGGER.warn("Booking charge sync skipped due to concurrent update bookingId={}", bookingId, exception);
            return false;
        }
    }

    public BookingFinanceUpdateResult dispatchPlannedOperations(
        Booking booking,
        BookingFinanceDispatchPlan plan
    ) {
        if (plan == null) {
            return null;
        }
        if (plan.providerOperationIds() != null) {
            for (String operationId : plan.providerOperationIds()) {
                dispatchProviderOperation(operationId);
            }
        }
        return loadCurrentFinanceUpdateResult(booking.getId());
    }

    private ProviderOperationDispatchResult dispatchProviderOperation(String operationId) {
        ProviderOperation claimed = providerOperationService.claimOperation(
            operationId,
            "manual-dispatch",
            LocalDateTime.now().plusMinutes(2)
        );
        if (claimed == null) {
            return loadProviderOperationResult(providerOperationService.getRequired(operationId));
        }
        return processClaimedProviderOperation(operationId);
    }

    public ProviderOperationDispatchResult processClaimedProviderOperation(String operationId) {
        ProviderOperation operation = providerOperationService.getRequired(operationId);
        if (operation.getStatus() != ProviderOperationStatus.PROCESSING) {
            return loadProviderOperationResult(operation);
        }
        if (isLegacyReadOnlyProvider(operation.getProvider())) {
            providerOperationService.markFailed(
                operation.getId(),
                operation.getProviderReference(),
                operation.getResponsePayloadJson(),
                "legacy_provider_retired"
            );
            return loadProviderOperationResult(providerOperationService.getRequired(operationId));
        }
        if (resolveClaimedOperationWithoutCallingProvider(operation)) {
            return loadProviderOperationResult(providerOperationService.getRequired(operationId));
        }
        return switch (operation.getOperationType()) {
            case BOOKING_CHECKOUT -> dispatchCheckoutOperation(operation);
            case BOOKING_REFUND -> dispatchRefundOperation(operation);
            case BOOKING_PAYOUT -> dispatchPayoutOperation(operation);
        };
    }

    private ProviderOperationDispatchResult dispatchCheckoutOperation(ProviderOperation operation) {
        ProviderOperation activeOperation = refreshActiveProcessingOperation(operation);
        if (activeOperation == null) {
            return loadProviderOperationResult(providerOperationService.getRequired(operation.getId()));
        }
        PaymentTransaction transaction = paymentTransactionRepository.findById(operation.getPaymentTransactionId())
            .orElseThrow(() -> new IllegalStateException("Charge transaction no encontrada"));
        Booking booking = bookingRepository.findDetailedById(operation.getBookingId())
            .orElseThrow(() -> new IllegalStateException("Booking checkout no encontrada"));
        User user = booking.getUser();
        PaymentProviderClient client = resolveProviderClient(activeOperation.getProvider());

        try {
            ProviderCheckoutSession session = client.createBookingCheckout(
                new BookingProviderCheckoutRequest(
                    transaction.getId(),
                    booking.getId(),
                    booking.getProfessionalId(),
                    transaction.getAmount(),
                    transaction.getCurrency(),
                    user == null ? null : user.getEmail(),
                    user == null ? null : user.getFullName(),
                    buildBookingDescription(booking),
                    null,
                    resolveWebhookUrl(activeOperation.getProvider()),
                    activeOperation.getProvider()
                )
            );
            requiresNewTransaction.executeWithoutResult(status -> {
                PaymentTransaction managedTransaction = paymentTransactionRepository.findById(transaction.getId())
                    .orElseThrow(() -> new IllegalStateException("Charge transaction no encontrada"));
                Booking managedBooking = bookingRepository.findDetailedById(booking.getId())
                    .orElseThrow(() -> new IllegalStateException("Booking checkout no encontrada"));
                managedTransaction.setProviderPaymentId(null);
                managedTransaction.setProviderStatus("CHECKOUT_CREATED");
                managedTransaction.setPayloadJson(writeCheckoutPayload(managedTransaction, session, managedBooking, null));
                paymentTransactionRepository.save(managedTransaction);
                bookingFinanceService.applyExternalPaymentEvidence(managedBooking, managedTransaction);
            });
            providerOperationService.markSucceeded(activeOperation.getId(), session.providerSubscriptionId(), writeJson(session));
            return new ProviderOperationDispatchResult(
                activeOperation.getId(),
                activeOperation.getOperationType(),
                session.checkoutUrl()
            );
        } catch (RuntimeException exception) {
            recordDispatchFailure(activeOperation, transaction.getProviderPaymentId(), transaction.getPayloadJson(), exception);
            throw exception;
        }
    }

    private ProviderOperationDispatchResult dispatchRefundOperation(ProviderOperation operation) {
        ProviderOperation activeOperation = refreshActiveProcessingOperation(operation);
        if (activeOperation == null) {
            return loadProviderOperationResult(providerOperationService.getRequired(operation.getId()));
        }
        PaymentTransaction refundTx = paymentTransactionRepository.findById(operation.getPaymentTransactionId())
            .orElseThrow(() -> new IllegalStateException("Refund transaction no encontrada"));
        Booking booking = bookingRepository.findDetailedById(operation.getBookingId())
            .orElseThrow(() -> new IllegalStateException("Booking refund no encontrada"));
        BookingRefundRecord refundRecord = bookingFinanceService.findById(operation.getRefundRecordId());
        if (refundRecord == null) {
            throw new IllegalStateException("Refund record no encontrado");
        }
        PaymentTransaction chargeTransaction = findLatestBookingTransaction(
            booking.getId(),
            PaymentTransactionType.BOOKING_CHARGE,
            List.of(
                PaymentTransactionStatus.APPROVED,
                PaymentTransactionStatus.PARTIALLY_REFUNDED,
                PaymentTransactionStatus.REFUNDED
            ),
            "dispatch_refund_charge_lookup"
        );
        if (chargeTransaction == null || chargeTransaction.getProviderPaymentId() == null || chargeTransaction.getProviderPaymentId().isBlank()) {
            throw new IllegalStateException("Charge provider payment id no disponible para refund");
        }
        PaymentProviderClient client = resolveProviderClient(activeOperation.getProvider());
        try {
            ProviderRefundResult providerRefund = client.createRefund(
                new ProviderRefundRequest(
                    chargeTransaction.getProviderPaymentId(),
                    booking.getProfessionalId(),
                    refundRecord.getId(),
                    refundRecord.getTargetAmount(),
                    refundRecord.getCurrency(),
                    refundRecord.getReasonCode().name(),
                    resolveWebhookUrl(activeOperation.getProvider())
                )
            );
            finalizeRefundDispatch(activeOperation, booking.getId(), refundTx.getId(), refundRecord.getId(), providerRefund);
            return new ProviderOperationDispatchResult(activeOperation.getId(), activeOperation.getOperationType(), null);
        } catch (RuntimeException exception) {
            recordDispatchFailure(activeOperation, refundTx.getProviderPaymentId(), refundTx.getPayloadJson(), exception);
            return new ProviderOperationDispatchResult(activeOperation.getId(), activeOperation.getOperationType(), null);
        }
    }

    private ProviderOperationDispatchResult dispatchPayoutOperation(ProviderOperation operation) {
        ProviderOperation activeOperation = refreshActiveProcessingOperation(operation);
        if (activeOperation == null) {
            return loadProviderOperationResult(providerOperationService.getRequired(operation.getId()));
        }
        PaymentTransaction payoutTx = paymentTransactionRepository.findById(operation.getPaymentTransactionId())
            .orElseThrow(() -> new IllegalStateException("Payout transaction no encontrada"));
        Booking booking = bookingRepository.findDetailedById(operation.getBookingId())
            .orElseThrow(() -> new IllegalStateException("Booking payout no encontrada"));
        BookingPayoutRecord payoutRecord = bookingFinanceService.findPayoutById(operation.getPayoutRecordId());
        if (payoutRecord == null) {
            throw new IllegalStateException("Payout record no encontrado");
        }
        PaymentProviderClient client = resolveProviderClient(activeOperation.getProvider());
        try {
            ProviderPayoutResult payoutResult = client.createPayout(buildPayoutRequest(booking, payoutRecord, payoutTx.getId()));
            finalizePayoutDispatch(activeOperation, booking.getId(), payoutTx.getId(), payoutRecord.getId(), payoutResult);
            return new ProviderOperationDispatchResult(activeOperation.getId(), activeOperation.getOperationType(), null);
        } catch (RuntimeException exception) {
            recordDispatchFailure(activeOperation, payoutTx.getProviderPaymentId(), payoutTx.getPayloadJson(), exception);
            return new ProviderOperationDispatchResult(activeOperation.getId(), activeOperation.getOperationType(), null);
        }
    }

    private boolean resolveClaimedOperationWithoutCallingProvider(ProviderOperation operation) {
        if (operation == null) {
            return true;
        }
        return switch (operation.getOperationType()) {
            case BOOKING_CHECKOUT -> reconcileCheckoutOperation(operation);
            case BOOKING_REFUND -> reconcileRefundOperation(operation);
            case BOOKING_PAYOUT -> reconcilePayoutOperation(operation);
        };
    }

    private boolean reconcileCheckoutOperation(ProviderOperation operation) {
        PaymentTransaction transaction = operation.getPaymentTransactionId() == null
            ? null
            : paymentTransactionRepository.findById(operation.getPaymentTransactionId()).orElse(null);
        if (transaction == null) {
            providerOperationService.markFailed(operation.getId(), operation.getProviderReference(), operation.getResponsePayloadJson(), "missing_charge_transaction");
            return true;
        }
        if (transaction.getStatus() == PaymentTransactionStatus.APPROVED
            || transaction.getStatus() == PaymentTransactionStatus.PARTIALLY_REFUNDED
            || transaction.getStatus() == PaymentTransactionStatus.REFUNDED) {
            providerOperationService.markSucceeded(operation.getId(), firstNonBlank(transaction.getProviderPaymentId(), operation.getProviderReference()), transaction.getPayloadJson());
            return true;
        }
        if (transaction.getStatus() == PaymentTransactionStatus.FAILED) {
            providerOperationService.markFailed(operation.getId(), firstNonBlank(transaction.getProviderPaymentId(), operation.getProviderReference()), transaction.getPayloadJson(), transaction.getProviderStatus());
            return true;
        }
        if (transaction.getProviderPaymentId() != null && !transaction.getProviderPaymentId().isBlank()) {
            syncPendingChargeStatus(operation.getBookingId());
            PaymentTransaction refreshed = paymentTransactionRepository.findById(transaction.getId()).orElse(transaction);
            if (refreshed.getStatus() == PaymentTransactionStatus.APPROVED
                || refreshed.getStatus() == PaymentTransactionStatus.PARTIALLY_REFUNDED
                || refreshed.getStatus() == PaymentTransactionStatus.REFUNDED) {
                providerOperationService.markSucceeded(operation.getId(), refreshed.getProviderPaymentId(), refreshed.getPayloadJson());
                return true;
            }
            if (refreshed.getStatus() == PaymentTransactionStatus.FAILED) {
                providerOperationService.markFailed(operation.getId(), refreshed.getProviderPaymentId(), refreshed.getPayloadJson(), refreshed.getProviderStatus());
                return true;
            }
            if (operation.getProviderReference() != null && !operation.getProviderReference().isBlank()) {
                providerOperationService.markUncertain(
                    operation.getId(),
                    operation.getProviderReference(),
                    refreshed.getPayloadJson(),
                    "awaiting_checkout_confirmation",
                    LocalDateTime.now().plusMinutes(15)
                );
                return true;
            }
        }
        return false;
    }

    private boolean reconcileRefundOperation(ProviderOperation operation) {
        PaymentTransaction refundTx = operation.getPaymentTransactionId() == null
            ? null
            : paymentTransactionRepository.findById(operation.getPaymentTransactionId()).orElse(null);
        BookingRefundRecord refundRecord = bookingFinanceService.findById(operation.getRefundRecordId());
        if (refundTx == null || refundRecord == null) {
            providerOperationService.markFailed(operation.getId(), operation.getProviderReference(), operation.getResponsePayloadJson(), "missing_refund_evidence");
            return true;
        }
        if (refundTx.getStatus() == PaymentTransactionStatus.APPROVED || refundTx.getStatus() == PaymentTransactionStatus.PARTIALLY_REFUNDED
            || refundRecord.getStatus() == BookingRefundStatus.COMPLETED) {
            providerOperationService.markSucceeded(operation.getId(), firstNonBlank(refundTx.getProviderPaymentId(), refundRecord.getProviderReference(), operation.getProviderReference()), refundTx.getPayloadJson());
            return true;
        }
        if (refundTx.getStatus() == PaymentTransactionStatus.FAILED || refundRecord.getStatus() == BookingRefundStatus.FAILED) {
            providerOperationService.markFailed(operation.getId(), firstNonBlank(refundTx.getProviderPaymentId(), refundRecord.getProviderReference(), operation.getProviderReference()), refundTx.getPayloadJson(), refundTx.getProviderStatus());
            return true;
        }
        if (operation.getProviderReference() != null && !operation.getProviderReference().isBlank()) {
            providerOperationService.markUncertain(
                operation.getId(),
                operation.getProviderReference(),
                refundTx.getPayloadJson(),
                "awaiting_refund_webhook",
                LocalDateTime.now().plusMinutes(15)
            );
            return true;
        }
        return false;
    }

    private boolean reconcilePayoutOperation(ProviderOperation operation) {
        PaymentTransaction payoutTx = operation.getPaymentTransactionId() == null
            ? null
            : paymentTransactionRepository.findById(operation.getPaymentTransactionId()).orElse(null);
        BookingPayoutRecord payoutRecord = bookingFinanceService.findPayoutById(operation.getPayoutRecordId());
        if (payoutTx == null || payoutRecord == null) {
            providerOperationService.markFailed(operation.getId(), operation.getProviderReference(), operation.getResponsePayloadJson(), "missing_payout_evidence");
            return true;
        }
        if (payoutTx.getStatus() == PaymentTransactionStatus.APPROVED
            || payoutTx.getStatus() == PaymentTransactionStatus.PARTIALLY_RELEASED
            || payoutRecord.getStatus() == BookingPayoutStatus.COMPLETED) {
            providerOperationService.markSucceeded(operation.getId(), firstNonBlank(payoutTx.getProviderPaymentId(), payoutRecord.getProviderReference(), operation.getProviderReference()), payoutTx.getPayloadJson());
            return true;
        }
        if (payoutTx.getStatus() == PaymentTransactionStatus.FAILED || payoutRecord.getStatus() == BookingPayoutStatus.FAILED) {
            providerOperationService.markFailed(operation.getId(), firstNonBlank(payoutTx.getProviderPaymentId(), payoutRecord.getProviderReference(), operation.getProviderReference()), payoutTx.getPayloadJson(), payoutTx.getProviderStatus());
            return true;
        }
        if (operation.getProviderReference() != null && !operation.getProviderReference().isBlank()) {
            providerOperationService.markUncertain(
                operation.getId(),
                operation.getProviderReference(),
                payoutTx.getPayloadJson(),
                "awaiting_payout_webhook",
                LocalDateTime.now().plusMinutes(15)
            );
            return true;
        }
        return false;
    }

    private ProviderOperationDispatchResult loadProviderOperationResult(ProviderOperation operation) {
        if (operation.getOperationType() == ProviderOperationType.BOOKING_CHECKOUT
            && operation.getPaymentTransactionId() != null) {
            PaymentTransaction transaction = paymentTransactionRepository.findById(operation.getPaymentTransactionId()).orElse(null);
            return new ProviderOperationDispatchResult(
                operation.getId(),
                operation.getOperationType(),
                extractCheckoutUrl(transaction)
            );
        }
        return new ProviderOperationDispatchResult(operation.getId(), operation.getOperationType(), null);
    }

    private void applyCheckoutDispatchResult(
        BookingPaymentSessionResponse response,
        ProviderOperationDispatchResult dispatchResult
    ) {
        if (response == null || dispatchResult == null) {
            return;
        }
        PaymentTransaction transaction = paymentTransactionRepository.findById(response.getTransactionId()).orElse(null);
        Booking booking = response.getBookingId() == null
            ? null
            : bookingRepository.findDetailedById(response.getBookingId()).orElse(null);
        BookingFinancialSummary summary = booking == null
            ? null
            : bookingFinanceService.ensureInitializedWithEvidence(booking);
        if (transaction != null) {
            response.setProvider(transaction.getProvider() == null ? response.getProvider() : transaction.getProvider().name());
        }
        response.setCheckoutUrl(dispatchResult.checkoutUrl());
        if (summary != null && summary.getFinancialStatus() != null) {
            response.setFinancialStatus(summary.getFinancialStatus().name());
        }
    }

    private void finalizeRefundDispatch(
        ProviderOperation operation,
        Long bookingId,
        String refundTransactionId,
        String refundRecordId,
        ProviderRefundResult providerRefund
    ) {
        try {
            requiresNewTransaction.executeWithoutResult(status -> {
                PaymentTransaction refundTx = paymentTransactionRepository.findById(refundTransactionId)
                    .orElseThrow(() -> new IllegalStateException("Refund transaction no encontrada"));
                Booking booking = bookingRepository.findDetailedById(bookingId)
                    .orElseThrow(() -> new IllegalStateException("Booking refund no encontrada"));
                refundTx.setProviderPaymentId(providerRefund.providerRefundId());
                refundTx.setProviderStatus(providerRefund.status());
                refundTx.setAmount(providerRefund.amount() == null ? refundTx.getAmount() : providerRefund.amount());
                refundTx.setCurrency(providerRefund.currency() == null ? refundTx.getCurrency() : providerRefund.currency());
                refundTx.setPayloadJson(providerRefund.rawResponseJson());
                BookingRefundRecord updatedRefund;
                if (isRefundFinalSuccess(providerRefund.status())) {
                    refundTx.setStatus(resolveRefundTransactionStatus(bookingFinanceService.findById(refundRecordId), providerRefund.amount()));
                    refundTx.setApprovedAt(LocalDateTime.now());
                    updatedRefund = bookingFinanceService.markRefundRecordCompleted(refundRecordId, providerRefund.providerRefundId());
                    providerOperationService.markSucceeded(operation.getId(), providerRefund.providerRefundId(), providerRefund.rawResponseJson());
                } else if (isRefundFailure(providerRefund.status())) {
                    refundTx.setStatus(PaymentTransactionStatus.FAILED);
                    refundTx.setFailedAt(LocalDateTime.now());
                    updatedRefund = bookingFinanceService.markRefundRecordFailed(refundRecordId, providerRefund.providerRefundId());
                    providerOperationService.markFailed(operation.getId(), providerRefund.providerRefundId(), providerRefund.rawResponseJson(), providerRefund.status());
                } else {
                    refundTx.setStatus(PaymentTransactionStatus.PENDING);
                    updatedRefund = bookingFinanceService.markRefundRecordPendingProvider(refundRecordId, providerRefund.providerRefundId());
                    providerOperationService.markUncertain(
                        operation.getId(),
                        providerRefund.providerRefundId(),
                        providerRefund.rawResponseJson(),
                        "awaiting_refund_webhook",
                        LocalDateTime.now().plusMinutes(15)
                    );
                }
                paymentTransactionRepository.save(refundTx);
                bookingFinanceService.applyRefundEvidence(booking, updatedRefund);
            });
        } catch (RuntimeException exception) {
            providerOperationService.markUncertain(
                operation.getId(),
                providerRefund.providerRefundId(),
                providerRefund.rawResponseJson(),
                exception.getMessage(),
                LocalDateTime.now().plusMinutes(15)
            );
            throw exception;
        }
    }

    private void finalizePayoutDispatch(
        ProviderOperation operation,
        Long bookingId,
        String payoutTransactionId,
        String payoutRecordId,
        ProviderPayoutResult payoutResult
    ) {
        try {
            requiresNewTransaction.executeWithoutResult(status -> {
                PaymentTransaction payoutTx = paymentTransactionRepository.findById(payoutTransactionId)
                    .orElseThrow(() -> new IllegalStateException("Payout transaction no encontrada"));
                Booking booking = bookingRepository.findDetailedById(bookingId)
                    .orElseThrow(() -> new IllegalStateException("Booking payout no encontrada"));
                BookingPayoutRecord payoutRecord = bookingFinanceService.findPayoutById(payoutRecordId);
                payoutTx.setProviderPaymentId(payoutResult.providerPayoutId());
                payoutTx.setProviderStatus(payoutResult.status());
                payoutTx.setPayloadJson(payoutResult.rawResponseJson());

                BookingPayoutRecord updatedRecord;
                if (isPayoutFinalSuccess(payoutResult.status())) {
                    payoutTx.setStatus(resolvePayoutTransactionStatus(payoutRecord, payoutResult.amount()));
                    payoutTx.setApprovedAt(LocalDateTime.now());
                    updatedRecord = bookingFinanceService.markPayoutRecordCompleted(
                        payoutRecordId,
                        operation.getProvider(),
                        payoutResult.providerPayoutId(),
                        payoutResult.amount(),
                        payoutResult.rawResponseJson(),
                        LocalDateTime.now()
                    );
                    providerOperationService.markSucceeded(operation.getId(), payoutResult.providerPayoutId(), payoutResult.rawResponseJson());
                } else if (isPayoutFailure(payoutResult.status())) {
                    payoutTx.setStatus(PaymentTransactionStatus.FAILED);
                    payoutTx.setFailedAt(LocalDateTime.now());
                    updatedRecord = bookingFinanceService.markPayoutRecordFailed(
                        payoutRecordId,
                        operation.getProvider(),
                        payoutResult.providerPayoutId(),
                        payoutResult.rawResponseJson(),
                        LocalDateTime.now()
                    );
                    providerOperationService.markFailed(operation.getId(), payoutResult.providerPayoutId(), payoutResult.rawResponseJson(), payoutResult.status());
                } else {
                    payoutTx.setStatus(PaymentTransactionStatus.PENDING);
                    updatedRecord = bookingFinanceService.markPayoutRecordPendingProvider(
                        payoutRecordId,
                        operation.getProvider(),
                        payoutResult.providerPayoutId(),
                        payoutResult.rawResponseJson()
                    );
                    providerOperationService.markSucceeded(operation.getId(), payoutResult.providerPayoutId(), payoutResult.rawResponseJson());
                }
                paymentTransactionRepository.save(payoutTx);
                bookingFinanceService.applyPayoutEvidence(booking, updatedRecord);
            });
        } catch (RuntimeException exception) {
            providerOperationService.markUncertain(
                operation.getId(),
                payoutResult.providerPayoutId(),
                payoutResult.rawResponseJson(),
                exception.getMessage(),
                LocalDateTime.now().plusMinutes(15)
            );
            throw exception;
        }
    }

    private BookingFinanceUpdateResult loadCurrentFinanceUpdateResult(Long bookingId) {
        Booking booking = bookingRepository.findDetailedById(bookingId)
            .orElseThrow(() -> new IllegalStateException("Reserva no encontrada"));
        BookingFinancialSummary summary = bookingFinanceService.ensureInitializedWithEvidence(booking);
        return new BookingFinanceUpdateResult(
            summary,
            bookingFinanceService.findLatestRefundRecord(bookingId),
            bookingFinanceService.findLatestPayoutRecord(bookingId)
        );
    }

    private BookingFinanceDispatchPlan initiateBookingPayout(
        Booking booking,
        BookingPayoutRecord payoutRecord,
        BookingRefundRecord refundRecord,
        boolean manualRetry
    ) {
        if (payoutRecord.getStatus() == BookingPayoutStatus.COMPLETED) {
            BookingFinancialSummary summary = bookingFinanceService.applyPayoutEvidence(booking, payoutRecord);
            return new BookingFinanceDispatchPlan(new BookingFinanceUpdateResult(summary, refundRecord, payoutRecord), List.of());
        }

        PaymentTransaction existingPayoutTx = paymentTransactionRepository.findTopByPayoutRecord_IdOrderByCreatedAtDesc(payoutRecord.getId())
            .orElse(null);
        if (!manualRetry && existingPayoutTx != null
            && (existingPayoutTx.getStatus() == PaymentTransactionStatus.PENDING
                || existingPayoutTx.getStatus() == PaymentTransactionStatus.APPROVED
                || existingPayoutTx.getStatus() == PaymentTransactionStatus.PARTIALLY_RELEASED)) {
            BookingFinancialSummary summary = bookingFinanceService.applyPayoutEvidence(booking, payoutRecord);
            return new BookingFinanceDispatchPlan(new BookingFinanceUpdateResult(summary, refundRecord, payoutRecord), List.of());
        }
        if (manualRetry && existingPayoutTx != null
            && (existingPayoutTx.getStatus() == PaymentTransactionStatus.PENDING
                || existingPayoutTx.getStatus() == PaymentTransactionStatus.APPROVED
                || existingPayoutTx.getStatus() == PaymentTransactionStatus.PARTIALLY_RELEASED)) {
            BookingFinancialSummary summary = bookingFinanceService.applyPayoutEvidence(booking, payoutRecord);
            return new BookingFinanceDispatchPlan(new BookingFinanceUpdateResult(summary, refundRecord, payoutRecord), List.of());
        }
        PaymentTransaction chargeTx = paymentTransactionRepository.findTopByBooking_IdAndTransactionTypeOrderByCreatedAtDesc(
            booking.getId(),
            PaymentTransactionType.BOOKING_CHARGE
        ).orElse(null);
        PaymentProvider provider = chargeTx == null || chargeTx.getProvider() == null
            ? PaymentProvider.MERCADOPAGO
            : chargeTx.getProvider();
        LocalDateTime settledAt = LocalDateTime.now();

        PaymentTransaction payoutTx = existingPayoutTx == null ? new PaymentTransaction() : existingPayoutTx;
        payoutTx.setProfessionalId(booking.getProfessionalId());
        payoutTx.setBooking(booking);
        payoutTx.setPayoutRecord(payoutRecord);
        payoutTx.setProvider(provider);
        payoutTx.setTransactionType(PaymentTransactionType.BOOKING_PAYOUT);
        payoutTx.setAmount(payoutRecord.getTargetAmount());
        payoutTx.setCurrency(payoutRecord.getCurrency());
        payoutTx.setStatus(resolvePayoutTransactionStatus(payoutRecord, payoutRecord.getTargetAmount()));
        payoutTx.setExternalReference("payout:" + payoutRecord.getId());
        payoutTx.setFailedAt(null);
        payoutTx.setApprovedAt(settledAt);
        payoutTx.setProviderStatus("MARKETPLACE_SETTLED");
        payoutTx.setProviderPaymentId(chargeTx == null ? null : chargeTx.getProviderPaymentId());
        payoutTx.setPayloadJson(writeJson(Map.of(
            "source", manualRetry ? "marketplace_settlement_retry" : "marketplace_settlement",
            "bookingId", booking.getId(),
            "payoutRecordId", payoutRecord.getId(),
            "chargeTransactionId", chargeTx == null ? null : chargeTx.getId(),
            "chargeProviderPaymentId", chargeTx == null ? null : chargeTx.getProviderPaymentId(),
            "provider", provider.name()
        )));
        paymentTransactionRepository.saveAndFlush(payoutTx);

        BookingPayoutRecord updatedRecord = bookingFinanceService.markPayoutRecordCompleted(
            payoutRecord.getId(),
            provider,
            chargeTx == null ? payoutRecord.getProviderReference() : chargeTx.getProviderPaymentId(),
            payoutRecord.getTargetAmount(),
            payoutTx.getPayloadJson(),
            settledAt
        );
        BookingFinancialSummary summary = bookingFinanceService.applyPayoutEvidence(booking, updatedRecord);
        return new BookingFinanceDispatchPlan(
            new BookingFinanceUpdateResult(summary, refundRecord, updatedRecord),
            List.of()
        );
    }

    private boolean syncPendingChargeStatus(Booking booking) {
        if (booking == null || booking.getId() == null) {
            return false;
        }

        PaymentTransaction pendingCharge = findLatestBookingTransaction(
            booking.getId(),
            PaymentTransactionType.BOOKING_CHARGE,
            List.of(PaymentTransactionStatus.PENDING),
            "pending_charge_sync"
        );
        if (pendingCharge == null || pendingCharge.getProvider() == null) {
            return false;
        }

        PaymentProviderClient client = providerClients.get(pendingCharge.getProvider());
        if (client == null) {
            return false;
        }

        ProviderVerificationResult verification;
        try {
            verification = client.verifyPayment(
                new ProviderVerificationRequest(
                    pendingCharge.getProviderPaymentId(),
                    null,
                    pendingCharge.getExternalReference(),
                    pendingCharge.getAmount(),
                    pendingCharge.getCurrency(),
                    booking.getProfessionalId()
                )
            );
        } catch (RuntimeException exception) {
            LOGGER.warn(
                "Booking charge sync failed bookingId={} transactionId={} providerPaymentId={}",
                booking.getId(),
                pendingCharge.getId(),
                pendingCharge.getProviderPaymentId(),
                exception
            );
            return false;
        }

        pendingCharge.setProviderStatus(verification.status());
        Map<String, Object> verificationPayload = buildVerificationPayload(pendingCharge, verification);
        pendingCharge.setPayloadJson(writeJson(verificationPayload));

        if (verification.finalApproved()) {
            ParsedWebhookEvent event = buildVerificationEvent(booking, pendingCharge, verification, WebhookEventType.PAYMENT_SUCCEEDED);
            applyChargeApproved(pendingCharge, event);
            PaymentTransaction saved = paymentTransactionRepository.save(pendingCharge);
            bookingFinanceService.applyExternalPaymentEvidence(booking, saved);
            billingNotificationIntegrationService.recordPaymentApproved(
                booking,
                saved,
                event,
                "payment_status_sync"
            );
            maybeConfirmBookingAfterSuccessfulCharge(booking, saved, event);
            return true;
        }

        if (isFailedVerificationStatus(verification.status())) {
            ParsedWebhookEvent event = buildVerificationEvent(booking, pendingCharge, verification, WebhookEventType.PAYMENT_FAILED);
            applyChargeFailed(pendingCharge, event);
            PaymentTransaction saved = paymentTransactionRepository.save(pendingCharge);
            bookingFinanceService.applyExternalPaymentEvidence(booking, saved);
            billingNotificationIntegrationService.recordPaymentFailed(
                booking,
                saved,
                event,
                "payment_status_sync"
            );
            return true;
        }

        paymentTransactionRepository.save(pendingCharge);
        return false;
    }

    private ProviderCheckoutSession recreatePendingCheckout(
        PaymentTransaction pendingCharge,
        Booking booking,
        User user
    ) {
        PaymentProvider provider = pendingCharge.getProvider() == null || isLegacyReadOnlyProvider(pendingCharge.getProvider())
            ? resolveProvider(null)
            : pendingCharge.getProvider();
        PaymentProviderClient client = resolveProviderClient(provider);
        String previousProviderPaymentId = pendingCharge.getProviderPaymentId();
        ProviderCheckoutSession session = client.createBookingCheckout(
            new BookingProviderCheckoutRequest(
                pendingCharge.getId(),
                booking.getId(),
                booking.getProfessionalId(),
                pendingCharge.getAmount(),
                pendingCharge.getCurrency(),
                user.getEmail(),
                user.getFullName(),
                buildBookingDescription(booking),
                null,
                resolveWebhookUrl(provider),
                provider
            )
        );
        pendingCharge.setProvider(provider);
        pendingCharge.setProviderPaymentId(null);
        pendingCharge.setPayloadJson(writeCheckoutPayload(pendingCharge, session, booking, previousProviderPaymentId));
        paymentTransactionRepository.save(pendingCharge);
        return session;
    }

    private Map<String, Object> buildVerificationPayload(
        PaymentTransaction pendingCharge,
        ProviderVerificationResult verification
    ) {
        Map<String, Object> verificationPayload = new java.util.LinkedHashMap<>();
        verificationPayload.put("source", "provider_verification");
        verificationPayload.put("providerPaymentId", pendingCharge.getProviderPaymentId());
        verificationPayload.put("status", verification.status());
        verificationPayload.put("amount", verification.amount());
        verificationPayload.put("currency", verification.currency());
        String checkoutUrl = extractCheckoutUrl(pendingCharge);
        if (checkoutUrl != null && !checkoutUrl.isBlank()) {
            verificationPayload.put("checkoutUrl", checkoutUrl);
        }
        return verificationPayload;
    }

    @Transactional
    public boolean processWebhook(PaymentEvent paymentEvent, ParsedWebhookEvent event) {
        PaymentTransaction transaction = resolveTransaction(event);
        Booking booking = transaction != null ? transaction.getBooking() : resolveBooking(event);
        if (booking == null) {
            BookingRefundRecord refundRecord = maybeResolveRefundRecord(transaction, event);
            if (refundRecord != null) {
                booking = refundRecord.getBooking();
            }
        }
        if (booking == null) {
            BookingPayoutRecord payoutRecord = maybeResolvePayoutRecord(transaction, event);
            if (payoutRecord != null) {
                booking = payoutRecord.getBooking();
            }
        }
        if (booking == null) {
            return false;
        }

        if ((event.eventType() == WebhookEventType.PAYMENT_REFUNDED
            || event.eventType() == WebhookEventType.REFUND_PARTIAL
            || event.eventType() == WebhookEventType.REFUND_FAILED)
            && (transaction == null || transaction.getTransactionType() != PaymentTransactionType.BOOKING_REFUND)) {
            BookingRefundRecord refundRecord = maybeResolveRefundRecord(transaction, event);
            if (refundRecord != null) {
                transaction = buildWebhookRefundTransaction(booking, refundRecord, event);
            }
        }

        if ((event.eventType() == WebhookEventType.PAYOUT_PENDING
            || event.eventType() == WebhookEventType.PAYOUT_SUCCEEDED
            || event.eventType() == WebhookEventType.PAYOUT_FAILED)
            && (transaction == null || transaction.getTransactionType() != PaymentTransactionType.BOOKING_PAYOUT)) {
            BookingPayoutRecord payoutRecord = maybeResolvePayoutRecord(transaction, event);
            if (payoutRecord != null) {
                transaction = buildWebhookPayoutTransaction(booking, payoutRecord, event);
            }
        }

        if (transaction == null) {
            transaction = buildWebhookBackfilledCharge(booking, event);
        }

        switch (event.eventType()) {
            case PAYMENT_SUCCEEDED, SUBSCRIPTION_RENEWED -> applyChargeApproved(transaction, event);
            case PAYMENT_FAILED -> applyChargeFailed(transaction, event);
            case PAYMENT_REFUNDED, REFUND_PARTIAL, REFUND_FAILED -> applyRefundEvent(transaction, booking, event);
            case PAYOUT_PENDING, PAYOUT_SUCCEEDED, PAYOUT_FAILED -> applyPayoutEvent(transaction, booking, event);
            case SUBSCRIPTION_PENDING, SUBSCRIPTION_CANCELLED, UNKNOWN -> {
                return false;
            }
        }

        PaymentTransaction saved = paymentTransactionRepository.save(transaction);
        BookingFinancialSummary summary = bookingFinanceService.applyExternalPaymentEvidence(booking, saved);
        emitFinancialNotification(booking, saved, event);
        markOperationSucceededFromTransaction(saved, event);
        maybeConfirmBookingAfterSuccessfulCharge(booking, saved, event);
        BookingRefundRecord refundRecord = maybeResolveRefundRecord(saved, event);
        BookingPayoutRecord payoutRecord = maybeResolvePayoutRecord(saved, event);
        if (refundRecord != null) {
            bookingFinanceService.applyRefundEvidence(booking, refundRecord);
            if (isRefundSuccessEvent(event.eventType())) {
                BookingPayoutRecord pendingPayout = bookingFinanceService.findLatestPayoutRecord(booking.getId());
                if (pendingPayout != null && pendingPayout.getStatus() == BookingPayoutStatus.PENDING_MANUAL) {
                    BookingFinanceDispatchPlan financePlan = processPostDecision(
                        booking,
                        new BookingFinanceUpdateResult(summary, refundRecord, pendingPayout)
                    );
                    Booking bookingForDispatch = booking;
                    BookingFinanceDispatchPlan planForDispatch = financePlan;
                    registerAfterCommit(() -> providerOperationWorker.kickOperationsAsync(planForDispatch.providerOperationIds()), false);
                    refundRecord = bookingFinanceService.findLatestRefundRecord(booking.getId());
                    payoutRecord = bookingFinanceService.findLatestPayoutRecord(booking.getId());
                }
            }
        }
        if (payoutRecord != null) {
            bookingFinanceService.applyPayoutEvidence(booking, payoutRecord);
        }

        paymentEvent.setProfessionalId(booking.getProfessionalId());
        paymentEvent.setBooking(booking);
        paymentEvent.setPaymentTransaction(saved);
        if (refundRecord != null) {
            paymentEvent.setRefundRecord(refundRecord);
        }
        if (payoutRecord != null) {
            paymentEvent.setPayoutRecord(payoutRecord);
        }
        return true;
    }

    private Booking resolveBooking(ParsedWebhookEvent event) {
        if (event.bookingId() != null) {
            return bookingRepository.findDetailedById(event.bookingId()).orElse(null);
        }
        Long bookingIdFromReference = parseBookingReference(event.orderReference());
        if (bookingIdFromReference != null) {
            return bookingRepository.findDetailedById(bookingIdFromReference).orElse(null);
        }
        return null;
    }

    private PaymentTransaction resolveTransaction(ParsedWebhookEvent event) {
        if (event.providerPaymentId() != null && !event.providerPaymentId().isBlank()) {
            PaymentTransaction transaction = paymentTransactionRepository.findByProviderAndProviderPaymentId(
                event.provider(),
                event.providerPaymentId()
            ).orElse(null);
            if (transaction != null) {
                return transaction;
            }
        }
        if (event.providerObjectId() != null && !event.providerObjectId().isBlank()) {
            PaymentTransaction transaction = paymentTransactionRepository.findByProviderAndProviderPaymentId(
                event.provider(),
                event.providerObjectId()
            ).orElse(null);
            if (transaction != null) {
                return transaction;
            }
        }
        if (event.orderReference() != null && !event.orderReference().isBlank()) {
            PaymentTransaction transaction = paymentTransactionRepository.findTopByExternalReferenceOrderByCreatedAtDesc(
                event.orderReference()
            ).orElse(null);
            if (transaction != null) {
                return transaction;
            }
            return paymentTransactionRepository.findById(event.orderReference()).orElse(null);
        }
        return null;
    }

    private PaymentTransaction buildWebhookBackfilledCharge(Booking booking, ParsedWebhookEvent event) {
        PaymentTransaction transaction = new PaymentTransaction();
        transaction.setProfessionalId(booking.getProfessionalId());
        transaction.setBooking(booking);
        transaction.setProvider(event.provider());
        transaction.setTransactionType(PaymentTransactionType.BOOKING_CHARGE);
        transaction.setProviderPaymentId(firstNonBlank(event.providerPaymentId(), event.providerObjectId()));
        transaction.setExternalReference("booking:" + booking.getId());
        transaction.setAmount(event.amount() == null ? bookingMoneyResolver.resolvePrepaidAmount(booking) : event.amount());
        transaction.setCurrency(event.currency() == null || event.currency().isBlank()
            ? bookingMoneyResolver.resolveCurrency(booking)
            : event.currency().trim().toUpperCase(Locale.ROOT));
        transaction.setStatus(PaymentTransactionStatus.PENDING);
        transaction.setPayloadJson(event.payloadJson());
        return transaction;
    }

    private PaymentTransaction buildWebhookRefundTransaction(
        Booking booking,
        BookingRefundRecord refundRecord,
        ParsedWebhookEvent event
    ) {
        PaymentTransaction transaction = new PaymentTransaction();
        transaction.setProfessionalId(booking.getProfessionalId());
        transaction.setBooking(booking);
        transaction.setRefundRecord(refundRecord);
        transaction.setProvider(event.provider());
        transaction.setTransactionType(PaymentTransactionType.BOOKING_REFUND);
        transaction.setProviderPaymentId(firstNonBlank(event.providerObjectId(), event.providerPaymentId()));
        transaction.setExternalReference("refund:" + refundRecord.getId());
        transaction.setAmount(event.amount() == null ? refundRecord.getTargetAmount() : event.amount());
        transaction.setCurrency(event.currency() == null || event.currency().isBlank()
            ? refundRecord.getCurrency()
            : event.currency().trim().toUpperCase(Locale.ROOT));
        transaction.setStatus(PaymentTransactionStatus.PENDING);
        transaction.setPayloadJson(event.payloadJson());
        return transaction;
    }

    private PaymentTransaction buildWebhookPayoutTransaction(
        Booking booking,
        BookingPayoutRecord payoutRecord,
        ParsedWebhookEvent event
    ) {
        PaymentTransaction transaction = new PaymentTransaction();
        transaction.setProfessionalId(booking.getProfessionalId());
        transaction.setBooking(booking);
        transaction.setPayoutRecord(payoutRecord);
        transaction.setProvider(event.provider());
        transaction.setTransactionType(PaymentTransactionType.BOOKING_PAYOUT);
        transaction.setProviderPaymentId(firstNonBlank(event.providerObjectId(), event.providerPaymentId()));
        transaction.setExternalReference("payout:" + payoutRecord.getId());
        transaction.setAmount(event.amount() == null ? payoutRecord.getTargetAmount() : event.amount());
        transaction.setCurrency(event.currency() == null || event.currency().isBlank()
            ? payoutRecord.getCurrency()
            : event.currency().trim().toUpperCase(Locale.ROOT));
        transaction.setStatus(PaymentTransactionStatus.PENDING);
        transaction.setPayloadJson(event.payloadJson());
        return transaction;
    }

    private void applyChargeApproved(PaymentTransaction transaction, ParsedWebhookEvent event) {
        transaction.setTransactionType(PaymentTransactionType.BOOKING_CHARGE);
        transaction.setProviderPaymentId(firstNonBlank(transaction.getProviderPaymentId(), event.providerPaymentId(), event.providerObjectId()));
        transaction.setProviderStatus(event.eventType().name());
        if (event.amount() != null) {
            transaction.setAmount(event.amount());
        }
        if (event.currency() != null && !event.currency().isBlank()) {
            transaction.setCurrency(event.currency().trim().toUpperCase(Locale.ROOT));
        }
        transaction.setStatus(PaymentTransactionStatus.APPROVED);
        transaction.setApprovedAt(event.eventTime() == null ? LocalDateTime.now() : event.eventTime());
        transaction.setPayloadJson(mergeChargePayload(transaction, event.payloadJson()));
    }

    private void applyChargeFailed(PaymentTransaction transaction, ParsedWebhookEvent event) {
        transaction.setTransactionType(PaymentTransactionType.BOOKING_CHARGE);
        transaction.setProviderPaymentId(firstNonBlank(transaction.getProviderPaymentId(), event.providerPaymentId(), event.providerObjectId()));
        transaction.setProviderStatus(event.eventType().name());
        transaction.setStatus(PaymentTransactionStatus.FAILED);
        transaction.setFailedAt(event.eventTime() == null ? LocalDateTime.now() : event.eventTime());
        transaction.setPayloadJson(mergeChargePayload(transaction, event.payloadJson()));
    }

    private void applyRefundEvent(PaymentTransaction transaction, Booking booking, ParsedWebhookEvent event) {
        BookingRefundRecord refundRecord = maybeResolveRefundRecord(transaction, event);
        if (refundRecord == null) {
            return;
        }

        if (transaction.getTransactionType() != PaymentTransactionType.BOOKING_REFUND) {
            transaction.setTransactionType(PaymentTransactionType.BOOKING_REFUND);
            transaction.setRefundRecord(refundRecord);
            transaction.setAmount(event.amount() == null ? refundRecord.getTargetAmount() : event.amount());
            transaction.setCurrency(event.currency() == null || event.currency().isBlank()
                ? refundRecord.getCurrency()
                : event.currency().trim().toUpperCase(Locale.ROOT));
        }

        transaction.setProviderPaymentId(firstNonBlank(transaction.getProviderPaymentId(), event.providerObjectId(), event.providerPaymentId()));
        transaction.setProviderStatus(event.eventType().name());
        transaction.setPayloadJson(event.payloadJson());
        if (event.eventType() == WebhookEventType.REFUND_FAILED) {
            transaction.setStatus(PaymentTransactionStatus.FAILED);
            transaction.setFailedAt(event.eventTime() == null ? LocalDateTime.now() : event.eventTime());
            bookingFinanceService.markRefundRecordFailed(refundRecord.getId(), transaction.getProviderPaymentId());
        } else if (event.eventType() == WebhookEventType.REFUND_PARTIAL) {
            transaction.setStatus(PaymentTransactionStatus.PARTIALLY_REFUNDED);
            transaction.setApprovedAt(event.eventTime() == null ? LocalDateTime.now() : event.eventTime());
            bookingFinanceService.markRefundRecordCompleted(refundRecord.getId(), transaction.getProviderPaymentId());
            PaymentTransaction chargeTx = paymentTransactionRepository.findTopByBooking_IdAndTransactionTypeOrderByCreatedAtDesc(
                booking.getId(),
                PaymentTransactionType.BOOKING_CHARGE
            ).orElse(null);
            if (chargeTx != null && chargeTx.getStatus() == PaymentTransactionStatus.APPROVED) {
                chargeTx.setStatus(PaymentTransactionStatus.PARTIALLY_REFUNDED);
                paymentTransactionRepository.save(chargeTx);
            }
        } else {
            transaction.setStatus(PaymentTransactionStatus.APPROVED);
            transaction.setApprovedAt(event.eventTime() == null ? LocalDateTime.now() : event.eventTime());
            bookingFinanceService.markRefundRecordCompleted(refundRecord.getId(), transaction.getProviderPaymentId());
            PaymentTransaction chargeTx = paymentTransactionRepository.findTopByBooking_IdAndTransactionTypeOrderByCreatedAtDesc(
                booking.getId(),
                PaymentTransactionType.BOOKING_CHARGE
            ).orElse(null);
            if (chargeTx != null) {
                if (event.amount() != null && chargeTx.getAmount() != null && event.amount().compareTo(chargeTx.getAmount()) < 0) {
                    chargeTx.setStatus(PaymentTransactionStatus.PARTIALLY_REFUNDED);
                } else {
                    chargeTx.setStatus(PaymentTransactionStatus.REFUNDED);
                }
                paymentTransactionRepository.save(chargeTx);
            }
        }
    }

    private void applyPayoutEvent(PaymentTransaction transaction, Booking booking, ParsedWebhookEvent event) {
        BookingPayoutRecord payoutRecord = maybeResolvePayoutRecord(transaction, event);
        if (payoutRecord == null) {
            return;
        }

        if (transaction.getTransactionType() != PaymentTransactionType.BOOKING_PAYOUT) {
            transaction.setTransactionType(PaymentTransactionType.BOOKING_PAYOUT);
            transaction.setPayoutRecord(payoutRecord);
            transaction.setAmount(event.amount() == null ? payoutRecord.getTargetAmount() : event.amount());
            transaction.setCurrency(event.currency() == null || event.currency().isBlank()
                ? payoutRecord.getCurrency()
                : event.currency().trim().toUpperCase(Locale.ROOT));
        }

        transaction.setProviderPaymentId(firstNonBlank(transaction.getProviderPaymentId(), event.providerObjectId(), event.providerPaymentId()));
        transaction.setProviderStatus(event.eventType().name());
        transaction.setPayloadJson(event.payloadJson());
        if (event.eventType() == WebhookEventType.PAYOUT_FAILED) {
            transaction.setStatus(PaymentTransactionStatus.FAILED);
            transaction.setFailedAt(event.eventTime() == null ? LocalDateTime.now() : event.eventTime());
            bookingFinanceService.markPayoutRecordFailed(
                payoutRecord.getId(),
                event.provider(),
                transaction.getProviderPaymentId(),
                event.payloadJson(),
                event.eventTime()
            );
        } else if (event.eventType() == WebhookEventType.PAYOUT_SUCCEEDED) {
            transaction.setStatus(resolvePayoutTransactionStatus(payoutRecord, event.amount()));
            transaction.setApprovedAt(event.eventTime() == null ? LocalDateTime.now() : event.eventTime());
            bookingFinanceService.markPayoutRecordCompleted(
                payoutRecord.getId(),
                event.provider(),
                transaction.getProviderPaymentId(),
                event.amount(),
                event.payloadJson(),
                event.eventTime()
            );
        } else {
            transaction.setStatus(PaymentTransactionStatus.PENDING);
            bookingFinanceService.markPayoutRecordPendingProvider(
                payoutRecord.getId(),
                event.provider(),
                transaction.getProviderPaymentId(),
                event.payloadJson()
            );
        }

        if (transaction.getStatus() == PaymentTransactionStatus.APPROVED
            || transaction.getStatus() == PaymentTransactionStatus.PARTIALLY_RELEASED) {
            PaymentTransaction chargeTx = paymentTransactionRepository.findTopByBooking_IdAndTransactionTypeOrderByCreatedAtDesc(
                booking.getId(),
                PaymentTransactionType.BOOKING_CHARGE
            ).orElse(null);
            if (chargeTx != null && chargeTx.getStatus() == PaymentTransactionStatus.APPROVED
                && event.amount() != null && chargeTx.getAmount() != null
                && event.amount().compareTo(chargeTx.getAmount()) < 0) {
                chargeTx.setStatus(PaymentTransactionStatus.PARTIALLY_RELEASED);
                paymentTransactionRepository.save(chargeTx);
            }
        }
    }

    private BookingRefundRecord maybeResolveRefundRecord(PaymentTransaction transaction, ParsedWebhookEvent event) {
        if (transaction != null && transaction.getRefundRecord() != null) {
            return transaction.getRefundRecord();
        }
        String providerReference = firstNonBlank(event.providerObjectId(), event.providerPaymentId());
        if (providerReference != null && !providerReference.isBlank()) {
            BookingRefundRecord refundRecord = bookingFinanceService.findByProviderReference(providerReference);
            if (refundRecord != null) {
                return refundRecord;
            }
        }
        String refundRecordId = parseRefundReference(event.orderReference());
        if (refundRecordId != null) {
            return bookingFinanceService.findById(refundRecordId);
        }
        return null;
    }

    private BookingPayoutRecord maybeResolvePayoutRecord(PaymentTransaction transaction, ParsedWebhookEvent event) {
        if (transaction != null && transaction.getPayoutRecord() != null) {
            return transaction.getPayoutRecord();
        }
        String providerReference = firstNonBlank(event.providerObjectId(), event.providerPaymentId());
        if (providerReference != null && !providerReference.isBlank()) {
            BookingPayoutRecord payoutRecord = bookingFinanceService.findPayoutByProviderReference(providerReference);
            if (payoutRecord != null) {
                return payoutRecord;
            }
        }
        String payoutRecordId = parsePayoutReference(event.orderReference());
        if (payoutRecordId != null) {
            return bookingFinanceService.findPayoutById(payoutRecordId);
        }
        return null;
    }

    private void maybeConfirmBookingAfterSuccessfulCharge(
        Booking booking,
        PaymentTransaction transaction,
        ParsedWebhookEvent event
    ) {
        if (booking == null || transaction == null || event == null) {
            return;
        }
        if (transaction.getTransactionType() != PaymentTransactionType.BOOKING_CHARGE) {
            return;
        }
        if (event.eventType() != WebhookEventType.PAYMENT_SUCCEEDED
            && event.eventType() != WebhookEventType.SUBSCRIPTION_RENEWED) {
            return;
        }
        if (booking.getOperationalStatus() != BookingOperationalStatus.PENDING) {
            return;
        }
        if (booking.getServicePaymentTypeSnapshot() == null
            || booking.getServicePaymentTypeSnapshot() == ServicePaymentType.ON_SITE) {
            return;
        }

        LocalDateTime confirmedAt = event.eventTime() == null ? LocalDateTime.now() : event.eventTime();
        booking.applyOperationalStatus(BookingOperationalStatus.CONFIRMED, confirmedAt);
        bookingRepository.save(booking);
        bookingEventService.record(
            booking,
            BookingEventType.BOOKING_CONFIRMED,
            BookingActorType.SYSTEM,
            null,
            Map.of(
                "source", "payment_webhook",
                "paymentTransactionId", transaction.getId(),
                "provider", event.provider().name(),
                "providerPaymentId", firstNonBlank(transaction.getProviderPaymentId(), event.providerPaymentId(), event.providerObjectId())
            )
        );
        bookingNotificationIntegrationService.recordBookingConfirmed(
            booking,
            BookingActorType.SYSTEM,
            null,
            "payment_webhook_auto_confirm"
        );
        triggerBookingSideEffectsAfterCommit(booking);
    }


    private void triggerBookingSideEffectsAfterCommit(Booking booking) {
        if (booking == null || booking.getProfessionalId() == null || booking.getStartDateTime() == null) {
            return;
        }
        ProfessionalProfile profile = professionalProfileRepository.findById(booking.getProfessionalId()).orElse(null);
        if (profile == null) {
            return;
        }
        registerAfterCommit(
            () -> sideEffectCoordinator.onBookingChanged(profile, Set.of(booking.getStartDateTime().toLocalDate())),
            false
        );
    }

    private boolean willConfirmBooking(
        Booking booking,
        PaymentTransaction transaction,
        ParsedWebhookEvent event
    ) {
        if (booking == null || transaction == null || event == null) {
            return false;
        }
        if (transaction.getTransactionType() != PaymentTransactionType.BOOKING_CHARGE) {
            return false;
        }
        if (booking.getOperationalStatus() != BookingOperationalStatus.PENDING) {
            return false;
        }
        return booking.getServicePaymentTypeSnapshot() != null
            && booking.getServicePaymentTypeSnapshot() != ServicePaymentType.ON_SITE;
    }

    private void emitFinancialNotification(
        Booking booking,
        PaymentTransaction transaction,
        ParsedWebhookEvent event
    ) {
        if (booking == null || transaction == null || event == null) {
            return;
        }
        switch (event.eventType()) {
            case PAYMENT_SUCCEEDED, SUBSCRIPTION_RENEWED -> {
                if (!willConfirmBooking(booking, transaction, event)) {
                    billingNotificationIntegrationService.recordPaymentApproved(
                        booking,
                        transaction,
                        event,
                        "payment_webhook"
                    );
                }
            }
            case PAYMENT_FAILED -> billingNotificationIntegrationService.recordPaymentFailed(
                booking,
                transaction,
                event,
                "payment_webhook"
            );
            case PAYMENT_REFUNDED, REFUND_PARTIAL -> billingNotificationIntegrationService.recordPaymentRefunded(
                booking,
                transaction,
                event,
                "payment_webhook"
            );
            case REFUND_FAILED, PAYOUT_PENDING, PAYOUT_SUCCEEDED, PAYOUT_FAILED,
                SUBSCRIPTION_PENDING, SUBSCRIPTION_CANCELLED, UNKNOWN -> {
            }
        }
    }

    private boolean isRefundSettled(BookingRefundRecord refundRecord) {
        return refundRecord == null
            || refundRecord.getStatus() == BookingRefundStatus.COMPLETED
            || refundRecord.getStatus() == BookingRefundStatus.CANCELLED;
    }

    private boolean isRefundSuccessEvent(WebhookEventType eventType) {
        return eventType == WebhookEventType.REFUND_PARTIAL || eventType == WebhookEventType.PAYMENT_REFUNDED;
    }

    private Long parseBookingReference(String rawReference) {
        if (rawReference == null || rawReference.isBlank() || !rawReference.startsWith("booking:")) {
            return null;
        }
        try {
            return Long.parseLong(rawReference.substring("booking:".length()));
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private String parseRefundReference(String rawReference) {
        if (rawReference == null || rawReference.isBlank() || !rawReference.startsWith("refund:")) {
            return null;
        }
        String refundRecordId = rawReference.substring("refund:".length()).trim();
        return refundRecordId.isBlank() ? null : refundRecordId;
    }

    private String parsePayoutReference(String rawReference) {
        if (rawReference == null || rawReference.isBlank() || !rawReference.startsWith("payout:")) {
            return null;
        }
        String payoutRecordId = rawReference.substring("payout:".length()).trim();
        return payoutRecordId.isBlank() ? null : payoutRecordId;
    }

    private ProviderPayoutRequest buildPayoutRequest(
        Booking booking,
        BookingPayoutRecord payoutRecord,
        String idempotencyKey
    ) {
        throw new ResponseStatusException(
            HttpStatus.CONFLICT,
            "Los payouts externos ya no se usan en reservas Mercado Pago only"
        );
    }

    private PaymentTransactionStatus resolvePayoutTransactionStatus(
        BookingPayoutRecord payoutRecord,
        BigDecimal releasedAmount
    ) {
        BigDecimal normalizedReleased = bookingMoneyResolver.normalizeAmount(
            releasedAmount == null ? payoutRecord.getTargetAmount() : releasedAmount
        );
        return normalizedReleased.compareTo(payoutRecord.getTargetAmount()) < 0
            ? PaymentTransactionStatus.PARTIALLY_RELEASED
            : PaymentTransactionStatus.APPROVED;
    }

    private BookingFinanceDispatchPlan completeSplitPayout(
        Booking booking,
        BookingPayoutRecord payoutRecord,
        BookingRefundRecord refundRecord,
        PaymentTransaction existingPayoutTx
    ) {
        BookingFinancialSummary summary = bookingFinanceService.applyPayoutEvidence(booking, payoutRecord);
        return new BookingFinanceDispatchPlan(new BookingFinanceUpdateResult(summary, refundRecord, payoutRecord), List.of());
    }

    private PaymentTransactionStatus resolveRefundTransactionStatus(
        BookingRefundRecord refundRecord,
        BigDecimal refundedAmount
    ) {
        BigDecimal normalizedRefunded = bookingMoneyResolver.normalizeAmount(
            refundedAmount == null ? refundRecord.getTargetAmount() : refundedAmount
        );
        return normalizedRefunded.compareTo(refundRecord.getTargetAmount()) < 0
            ? PaymentTransactionStatus.PARTIALLY_REFUNDED
            : PaymentTransactionStatus.APPROVED;
    }

    private boolean isRefundFinalSuccess(String status) {
        String normalized = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
        return "PAID".equals(normalized)
            || "APPROVED".equals(normalized)
            || "SUCCESS".equals(normalized)
            || "COMPLETED".equals(normalized)
            || "REFUNDED".equals(normalized);
    }

    private boolean isRefundFailure(String status) {
        String normalized = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
        return "REJECTED".equals(normalized)
            || "FAILED".equals(normalized)
            || "CANCELLED".equals(normalized)
            || "CANCELED".equals(normalized)
            || "DENIED".equals(normalized);
    }

    private boolean isPayoutFinalSuccess(String status) {
        String normalized = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
        return "PAID".equals(normalized) || "DELIVERED".equals(normalized);
    }

    private boolean isPayoutFailure(String status) {
        String normalized = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
        return "REJECTED".equals(normalized) || "CANCELLED".equals(normalized);
    }

    private PaymentProvider resolveProvider(String rawProvider) {
        if (rawProvider == null || rawProvider.isBlank()) {
            return PaymentProvider.MERCADOPAGO;
        }
        PaymentProvider provider = PaymentProvider.fromCode(rawProvider);
        if (provider != PaymentProvider.MERCADOPAGO) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Las reservas solo soportan provider MERCADOPAGO"
            );
        }
        return provider;
    }

    private PaymentProviderClient resolveProviderClient(PaymentProvider provider) {
        if (isLegacyReadOnlyProvider(provider)) {
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "El provider solicitado fue retirado del runtime activo"
            );
        }
        PaymentProviderClient client = providerClients.get(provider);
        if (client == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Provider no configurado");
        }
        return client;
    }

    private boolean isLegacyReadOnlyProvider(PaymentProvider provider) {
        return provider != null && provider.isLegacyReadOnly();
    }

    private String resolveWebhookUrl(PaymentProvider provider) {
        String baseUrl = billingProperties.getWebhookBaseUrl();
        if (baseUrl == null || baseUrl.isBlank()) {
            return null;
        }
        return baseUrl.replaceAll("/+$", "") + "/webhooks/" + provider.name().toLowerCase(Locale.ROOT);
    }

    private String buildBookingDescription(Booking booking) {
        return "Plura booking " + booking.getId() + " - " + booking.getServiceNameSnapshot();
    }

    private String writeCheckoutPayload(
        PaymentTransaction transaction,
        ProviderCheckoutSession session,
        Booking booking,
        String previousProviderPaymentId
    ) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("source", "booking_checkout");
        payload.put("transactionId", transaction == null ? null : transaction.getId());
        payload.put("bookingId", booking == null ? null : booking.getId());
        payload.put("externalReference", transaction == null ? null : transaction.getExternalReference());
        payload.put("provider", transaction == null || transaction.getProvider() == null ? null : transaction.getProvider().name());
        payload.put("checkoutUrl", session.checkoutUrl());
        payload.put("providerCheckoutReference", session.providerSubscriptionId());
        if (previousProviderPaymentId != null && !previousProviderPaymentId.isBlank()
            && !previousProviderPaymentId.equals(session.providerSubscriptionId())) {
            payload.put("previousProviderPaymentId", previousProviderPaymentId);
        }
        return writeJson(payload);
    }

    private PaymentTransaction findLatestBookingTransaction(
        Long bookingId,
        PaymentTransactionType transactionType,
        List<PaymentTransactionStatus> statuses,
        String lookupContext
    ) {
        List<PaymentTransaction> transactions = paymentTransactionRepository.findByBooking_IdAndTransactionTypeAndStatusIn(
            bookingId,
            transactionType,
            statuses
        );
        if (transactions.size() > 1) {
            LOGGER.warn(
                "Multiple booking transactions found bookingId={} transactionType={} statuses={} count={} context={}",
                bookingId,
                transactionType,
                statuses,
                transactions.size(),
                lookupContext
            );
        }
        return transactions.stream()
            .max(Comparator
                .comparing(PaymentTransaction::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(PaymentTransaction::getUpdatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
            .orElse(null);
    }

    private String extractCheckoutUrl(PaymentTransaction transaction) {
        if (transaction == null || transaction.getPayloadJson() == null || transaction.getPayloadJson().isBlank()) {
            return null;
        }
        try {
            ProviderCheckoutSession session = objectMapper.readValue(transaction.getPayloadJson(), ProviderCheckoutSession.class);
            if (session.checkoutUrl() != null && !session.checkoutUrl().isBlank()) {
                return session.checkoutUrl();
            }
        } catch (JsonProcessingException ignored) {
            // Fallback a JSON tree para payloads legacy o parciales.
        }

        try {
            JsonNode payload = objectMapper.readTree(transaction.getPayloadJson());
            return firstNonBlank(
                payload.path("checkoutUrl").asText(null),
                payload.path("checkout_url").asText(null),
                payload.path("redirect_url").asText(null),
                payload.path("url").asText(null)
            );
        } catch (JsonProcessingException ignored) {
            return null;
        }
    }

    private String extractSplitCode(PaymentTransaction transaction) {
        return null;
    }

    private String mergeChargePayload(PaymentTransaction transaction, String nextPayloadJson) {
        Map<String, Object> payload = new LinkedHashMap<>();
        if (nextPayloadJson != null && !nextPayloadJson.isBlank()) {
            try {
                JsonNode node = objectMapper.readTree(nextPayloadJson);
                if (node.isObject()) {
                    node.fields().forEachRemaining(entry -> payload.put(entry.getKey(), entry.getValue()));
                }
            } catch (JsonProcessingException exception) {
                payload.put("rawPayload", nextPayloadJson);
            }
        }

        String checkoutUrl = extractCheckoutUrl(transaction);
        if (checkoutUrl != null && !checkoutUrl.isBlank()) {
            payload.putIfAbsent("checkoutUrl", checkoutUrl);
        }
        return writeJson(payload);
    }

    private User loadClient(String rawUserId) {
        Long userId;
        try {
            userId = Long.parseLong(rawUserId);
        } catch (NumberFormatException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesión inválida");
        }
        User user = userRepository.findByIdAndDeletedAtIsNull(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));
        ensureClientUser(user);
        return user;
    }

    private void ensureClientUser(User user) {
        if (user.getRole() != UserRole.USER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo clientes");
        }
    }

    private String writeJson(Object payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException exception) {
            return "{\"serializationError\":true}";
        }
    }

    private ParsedWebhookEvent buildVerificationEvent(
        Booking booking,
        PaymentTransaction transaction,
        ProviderVerificationResult verification,
        WebhookEventType eventType
    ) {
        return new ParsedWebhookEvent(
            transaction.getProvider(),
            WebhookEventDomain.RESERVATION,
            "sync:" + transaction.getProviderPaymentId() + ":" + eventType.name().toLowerCase(Locale.ROOT),
            firstNonBlank(verification.providerObjectId(), transaction.getProviderPaymentId()),
            eventType,
            booking.getProfessionalId(),
            booking.getId(),
            null,
            firstNonBlank(transaction.getProviderPaymentId(), verification.providerObjectId()),
            transaction.getExternalReference(),
            verification.amount(),
            verification.currency(),
            null,
            false,
            LocalDateTime.now(),
            "provider_verification",
            transaction.getPayloadJson()
        );
    }

    private boolean isFailedVerificationStatus(String status) {
        if (status == null || status.isBlank()) {
            return false;
        }
        String normalized = status.trim().toUpperCase(Locale.ROOT);
        return normalized.equals("REJECTED")
            || normalized.equals("FAILED")
            || normalized.equals("CANCELLED")
            || normalized.equals("CANCELED")
            || normalized.equals("EXPIRED")
            || normalized.equals("DENIED");
    }

    private void registerAfterCommit(Runnable action, boolean propagateFailures) {
        Runnable guarded = () -> {
            try {
                action.run();
            } catch (RuntimeException exception) {
                if (propagateFailures) {
                    throw exception;
                }
                LOGGER.warn("Provider afterCommit dispatch failed", exception);
            }
        };
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    guarded.run();
                }
            });
            return;
        }
        guarded.run();
    }

    private void markOperationSucceededFromTransaction(PaymentTransaction transaction, ParsedWebhookEvent event) {
        if (transaction == null || transaction.getExternalReference() == null || transaction.getExternalReference().isBlank()) {
            return;
        }
        ProviderOperationType operationType = switch (transaction.getTransactionType()) {
            case BOOKING_CHARGE -> ProviderOperationType.BOOKING_CHECKOUT;
            case BOOKING_REFUND -> ProviderOperationType.BOOKING_REFUND;
            case BOOKING_PAYOUT -> null;
            default -> null;
        };
        if (operationType == null) {
            return;
        }
        providerOperationService.markSucceededByReference(
            operationType,
            transaction.getExternalReference(),
            firstNonBlank(transaction.getProviderPaymentId(), event.providerPaymentId(), event.providerObjectId()),
            event.payloadJson()
        );
    }

    private ProviderOperation refreshActiveProcessingOperation(ProviderOperation operation) {
        ProviderOperation latest = providerOperationService.getRequired(operation.getId());
        if (latest.getStatus() != ProviderOperationStatus.PROCESSING) {
            LOGGER.info(
                "Skipping provider call because operation state changed operationId={} type={} status={} externalReference={} attemptCount={} workerId={}",
                latest.getId(),
                latest.getOperationType(),
                latest.getStatus(),
                latest.getExternalReference(),
                latest.getAttemptCount(),
                latest.getLockedBy()
            );
            return null;
        }
        if (operation.getLockedBy() != null
            && latest.getLockedBy() != null
            && !operation.getLockedBy().equals(latest.getLockedBy())) {
            LOGGER.info(
                "Skipping provider call because operation lease changed owner operationId={} type={} externalReference={} workerId={} newWorkerId={}",
                latest.getId(),
                latest.getOperationType(),
                latest.getExternalReference(),
                operation.getLockedBy(),
                latest.getLockedBy()
            );
            return null;
        }
        return latest;
    }

    private void recordDispatchFailure(
        ProviderOperation operation,
        String providerReference,
        String responsePayloadJson,
        RuntimeException exception
    ) {
        if (isRetryableProviderException(exception)) {
            providerOperationService.markRetryable(
                operation.getId(),
                providerReference,
                responsePayloadJson,
                exception.getMessage(),
                nextRetryAt(operation.getAttemptCount())
            );
            return;
        }
        providerOperationService.markFailed(
            operation.getId(),
            providerReference,
            responsePayloadJson,
            exception.getMessage()
        );
    }

    private boolean isRetryableProviderException(RuntimeException exception) {
        if (exception instanceof ResponseStatusException responseStatusException) {
            int statusCode = responseStatusException.getStatusCode().value();
            if (statusCode == 408 || statusCode == 429) {
                return true;
            }
            return !responseStatusException.getStatusCode().is4xxClientError();
        }
        return !(exception instanceof IllegalArgumentException || exception instanceof IllegalStateException);
    }

    private LocalDateTime nextRetryAt(Integer attemptCount) {
        int attempt = attemptCount == null ? 1 : Math.max(1, attemptCount);
        long delayMinutes = switch (attempt) {
            case 1 -> 1L;
            case 2 -> 5L;
            case 3 -> 15L;
            case 4 -> 30L;
            default -> 60L;
        };
        return LocalDateTime.now().plusMinutes(delayMinutes);
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private record ProviderOperationDispatchResult(
        String operationId,
        ProviderOperationType operationType,
        String checkoutUrl
    ) {}
}
