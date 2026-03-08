package com.plura.plurabackend.booking.finance;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.billing.BillingProperties;
import com.plura.plurabackend.billing.payments.model.PaymentEvent;
import com.plura.plurabackend.billing.payments.model.PaymentProvider;
import com.plura.plurabackend.billing.payments.model.PaymentTransaction;
import com.plura.plurabackend.billing.payments.model.PaymentTransactionStatus;
import com.plura.plurabackend.billing.payments.model.PaymentTransactionType;
import com.plura.plurabackend.billing.payments.provider.BookingProviderCheckoutRequest;
import com.plura.plurabackend.billing.payments.provider.PaymentProviderClient;
import com.plura.plurabackend.billing.payments.provider.ProviderCheckoutSession;
import com.plura.plurabackend.billing.payments.provider.ProviderPayoutRequest;
import com.plura.plurabackend.billing.payments.provider.ProviderPayoutResult;
import com.plura.plurabackend.billing.payments.provider.ProviderRefundRequest;
import com.plura.plurabackend.billing.payments.provider.ProviderRefundResult;
import com.plura.plurabackend.billing.payments.repository.PaymentTransactionRepository;
import com.plura.plurabackend.billing.webhooks.ParsedWebhookEvent;
import com.plura.plurabackend.billing.webhooks.WebhookEventType;
import com.plura.plurabackend.booking.dto.BookingPaymentSessionRequest;
import com.plura.plurabackend.booking.dto.BookingPaymentSessionResponse;
import com.plura.plurabackend.booking.finance.model.BookingFinancialSummary;
import com.plura.plurabackend.booking.finance.model.BookingPayoutRecord;
import com.plura.plurabackend.booking.finance.model.BookingPayoutStatus;
import com.plura.plurabackend.booking.finance.model.BookingRefundRecord;
import com.plura.plurabackend.booking.finance.model.BookingRefundStatus;
import com.plura.plurabackend.booking.model.Booking;
import com.plura.plurabackend.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.booking.model.ServicePaymentType;
import com.plura.plurabackend.booking.repository.BookingRepository;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.user.model.User;
import com.plura.plurabackend.user.model.UserRole;
import com.plura.plurabackend.user.repository.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BookingProviderIntegrationService {

    private static final Logger LOGGER = LoggerFactory.getLogger(BookingProviderIntegrationService.class);

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final BookingFinanceService bookingFinanceService;
    private final BookingMoneyResolver bookingMoneyResolver;
    private final BillingProperties billingProperties;
    private final ObjectMapper objectMapper;
    private final Map<PaymentProvider, PaymentProviderClient> providerClients;

    public BookingProviderIntegrationService(
        BookingRepository bookingRepository,
        UserRepository userRepository,
        PaymentTransactionRepository paymentTransactionRepository,
        BookingFinanceService bookingFinanceService,
        BookingMoneyResolver bookingMoneyResolver,
        BillingProperties billingProperties,
        ObjectMapper objectMapper,
        List<PaymentProviderClient> clients
    ) {
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.bookingFinanceService = bookingFinanceService;
        this.bookingMoneyResolver = bookingMoneyResolver;
        this.billingProperties = billingProperties;
        this.objectMapper = objectMapper;
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

        PaymentTransaction existingApproved = paymentTransactionRepository.findByBooking_IdAndTransactionTypeAndStatusIn(
            bookingId,
            PaymentTransactionType.BOOKING_CHARGE,
            List.of(
                PaymentTransactionStatus.APPROVED,
                PaymentTransactionStatus.PARTIALLY_REFUNDED,
                PaymentTransactionStatus.REFUNDED
            )
        ).stream().findFirst().orElse(null);
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

        PaymentProvider provider = resolveProvider(request == null ? null : request.getProvider());
        PaymentProviderClient client = resolveProviderClient(provider);

        PaymentTransaction transaction = new PaymentTransaction();
        transaction.setProfessional(booking.getProfessional());
        transaction.setBooking(booking);
        transaction.setProvider(provider);
        transaction.setTransactionType(PaymentTransactionType.BOOKING_CHARGE);
        transaction.setAmount(amount);
        transaction.setCurrency(bookingMoneyResolver.resolveCurrency(booking));
        transaction.setStatus(PaymentTransactionStatus.PENDING);
        transaction.setExternalReference("booking:" + booking.getId());
        transaction = paymentTransactionRepository.saveAndFlush(transaction);

        ProviderCheckoutSession session = client.createBookingCheckout(
            new BookingProviderCheckoutRequest(
                transaction.getId(),
                booking.getId(),
                booking.getProfessional().getId(),
                amount,
                transaction.getCurrency(),
                user.getEmail(),
                user.getFullName(),
                buildBookingDescription(booking),
                resolveWebhookUrl(provider),
                provider
            )
        );

        transaction.setProviderPaymentId(session.providerSubscriptionId());
        transaction.setPayloadJson(writeJson(session));
        transaction = paymentTransactionRepository.save(transaction);

        BookingFinancialSummary summary = bookingFinanceService.applyExternalPaymentEvidence(booking, transaction);
        return new BookingPaymentSessionResponse(
            booking.getId(),
            transaction.getId(),
            provider.name(),
            session.checkoutUrl(),
            amount,
            transaction.getCurrency(),
            summary.getFinancialStatus().name()
        );
    }

    @Transactional
    public BookingFinanceUpdateResult processPostDecision(
        Booking booking,
        BookingFinanceUpdateResult financeResult
    ) {
        if (financeResult == null) {
            return financeResult;
        }

        if (financeResult.payoutRecord() != null) {
            return initiateBookingPayout(booking, financeResult.payoutRecord(), financeResult.refundRecord(), false);
        }

        if (financeResult.refundRecord() == null) {
            return financeResult;
        }

        return initiateBookingRefund(booking, financeResult.refundRecord(), financeResult.payoutRecord(), false);
    }

    @Transactional
    public BookingFinanceUpdateResult retryRefund(
        Booking booking,
        BookingRefundRecord refundRecord
    ) {
        if (refundRecord == null) {
            BookingFinancialSummary summary = bookingFinanceService.ensureInitializedWithEvidence(booking);
            return new BookingFinanceUpdateResult(summary, null, null);
        }
        if (refundRecord.getStatus() != BookingRefundStatus.PENDING_MANUAL) {
            if (refundRecord.getStatus() != BookingRefundStatus.FAILED) {
                BookingFinancialSummary summary = bookingFinanceService.applyRefundEvidence(booking, refundRecord);
                return new BookingFinanceUpdateResult(summary, refundRecord, null);
            }
        }
        return initiateBookingRefund(booking, refundRecord, null, true);
    }

    private BookingFinanceUpdateResult initiateBookingRefund(
        Booking booking,
        BookingRefundRecord refundRecord,
        BookingPayoutRecord payoutRecord,
        boolean manualRetry
    ) {
        if (refundRecord == null) {
            BookingFinancialSummary summary = bookingFinanceService.ensureInitializedWithEvidence(booking);
            return new BookingFinanceUpdateResult(summary, null, payoutRecord);
        }
        if (!manualRetry && refundRecord.getStatus() != BookingRefundStatus.PENDING_MANUAL) {
            BookingFinancialSummary summary = bookingFinanceService.applyRefundEvidence(booking, refundRecord);
            return new BookingFinanceUpdateResult(summary, refundRecord, payoutRecord);
        }
        PaymentTransaction chargeTransaction = paymentTransactionRepository.findByBooking_IdAndTransactionTypeAndStatusIn(
            booking.getId(),
            PaymentTransactionType.BOOKING_CHARGE,
            List.of(
                PaymentTransactionStatus.APPROVED,
                PaymentTransactionStatus.PARTIALLY_REFUNDED,
                PaymentTransactionStatus.REFUNDED
            )
        ).stream().findFirst().orElse(null);
        if (chargeTransaction == null || chargeTransaction.getProvider() == null
            || chargeTransaction.getProviderPaymentId() == null || chargeTransaction.getProviderPaymentId().isBlank()) {
            BookingFinancialSummary summary = bookingFinanceService.applyRefundEvidence(booking, refundRecord);
            return new BookingFinanceUpdateResult(summary, refundRecord, payoutRecord);
        }

        PaymentProviderClient client = providerClients.get(chargeTransaction.getProvider());
        if (client == null) {
            BookingFinancialSummary summary = bookingFinanceService.applyRefundEvidence(booking, refundRecord);
            return new BookingFinanceUpdateResult(summary, refundRecord, payoutRecord);
        }

        PaymentTransaction existingRefundTx = paymentTransactionRepository.findTopByRefundRecord_IdOrderByCreatedAtDesc(refundRecord.getId())
            .orElse(null);
        if (existingRefundTx != null && !manualRetry) {
            BookingFinancialSummary summary = bookingFinanceService.applyRefundEvidence(booking, refundRecord);
            return new BookingFinanceUpdateResult(summary, refundRecord, payoutRecord);
        }
        if (existingRefundTx != null && manualRetry
            && (existingRefundTx.getStatus() == PaymentTransactionStatus.PENDING
                || existingRefundTx.getStatus() == PaymentTransactionStatus.APPROVED
                || existingRefundTx.getStatus() == PaymentTransactionStatus.PARTIALLY_REFUNDED
                || existingRefundTx.getStatus() == PaymentTransactionStatus.REFUNDED)) {
            BookingFinancialSummary summary = bookingFinanceService.applyRefundEvidence(booking, refundRecord);
            return new BookingFinanceUpdateResult(summary, refundRecord, payoutRecord);
        }

        ProviderRefundResult providerRefund = client.createRefund(
            new ProviderRefundRequest(
                chargeTransaction.getProviderPaymentId(),
                refundRecord.getId(),
                refundRecord.getTargetAmount(),
                refundRecord.getCurrency(),
                refundRecord.getReasonCode().name(),
                resolveWebhookUrl(chargeTransaction.getProvider())
            )
        );

        PaymentTransaction refundTx = new PaymentTransaction();
        refundTx.setProfessional(booking.getProfessional());
        refundTx.setBooking(booking);
        refundTx.setRefundRecord(refundRecord);
        refundTx.setProvider(chargeTransaction.getProvider());
        refundTx.setTransactionType(PaymentTransactionType.BOOKING_REFUND);
        refundTx.setProviderPaymentId(providerRefund.providerRefundId());
        refundTx.setProviderStatus(providerRefund.status());
        refundTx.setExternalReference("refund:" + refundRecord.getId());
        refundTx.setAmount(providerRefund.amount() == null ? refundRecord.getTargetAmount() : providerRefund.amount());
        refundTx.setCurrency(providerRefund.currency() == null ? refundRecord.getCurrency() : providerRefund.currency());
        refundTx.setStatus(PaymentTransactionStatus.PENDING);
        refundTx.setPayloadJson(providerRefund.rawResponseJson());
        paymentTransactionRepository.save(refundTx);

        BookingRefundRecord updatedRefund = bookingFinanceService.markRefundRecordPendingProvider(
            refundRecord.getId(),
            providerRefund.providerRefundId()
        );
        BookingFinancialSummary summary = bookingFinanceService.applyRefundEvidence(booking, updatedRefund);
        return new BookingFinanceUpdateResult(summary, updatedRefund, payoutRecord);
    }

    @Transactional
    public BookingFinanceUpdateResult retryPayout(
        Booking booking,
        BookingPayoutRecord payoutRecord
    ) {
        if (payoutRecord == null) {
            BookingFinancialSummary summary = bookingFinanceService.ensureInitializedWithEvidence(booking);
            return new BookingFinanceUpdateResult(summary, null, null);
        }
        return initiateBookingPayout(booking, payoutRecord, null, true);
    }

    private BookingFinanceUpdateResult initiateBookingPayout(
        Booking booking,
        BookingPayoutRecord payoutRecord,
        BookingRefundRecord refundRecord,
        boolean manualRetry
    ) {
        if (payoutRecord.getStatus() == BookingPayoutStatus.COMPLETED) {
            BookingFinancialSummary summary = bookingFinanceService.applyPayoutEvidence(booking, payoutRecord);
            return new BookingFinanceUpdateResult(summary, refundRecord, payoutRecord);
        }

        PaymentTransaction existingPayoutTx = paymentTransactionRepository.findTopByPayoutRecord_IdOrderByCreatedAtDesc(payoutRecord.getId())
            .orElse(null);
        if (!manualRetry && existingPayoutTx != null
            && (existingPayoutTx.getStatus() == PaymentTransactionStatus.PENDING
                || existingPayoutTx.getStatus() == PaymentTransactionStatus.APPROVED
                || existingPayoutTx.getStatus() == PaymentTransactionStatus.PARTIALLY_RELEASED)) {
            BookingFinancialSummary summary = bookingFinanceService.applyPayoutEvidence(booking, payoutRecord);
            return new BookingFinanceUpdateResult(summary, refundRecord, payoutRecord);
        }
        if (manualRetry && existingPayoutTx != null
            && (existingPayoutTx.getStatus() == PaymentTransactionStatus.PENDING
                || existingPayoutTx.getStatus() == PaymentTransactionStatus.APPROVED
                || existingPayoutTx.getStatus() == PaymentTransactionStatus.PARTIALLY_RELEASED)) {
            BookingFinancialSummary summary = bookingFinanceService.applyPayoutEvidence(booking, payoutRecord);
            return new BookingFinanceUpdateResult(summary, refundRecord, payoutRecord);
        }

        PaymentProvider provider = PaymentProvider.DLOCAL;
        PaymentProviderClient client = providerClients.get(provider);
        if (client == null) {
            BookingPayoutRecord failed = bookingFinanceService.markPayoutRecordFailed(
                payoutRecord.getId(),
                provider,
                payoutRecord.getProviderReference(),
                "{\"reason\":\"provider_not_configured\"}",
                LocalDateTime.now()
            );
            BookingFinancialSummary summary = bookingFinanceService.applyPayoutEvidence(booking, failed);
            return new BookingFinanceUpdateResult(summary, refundRecord, failed);
        }

        PaymentTransaction payoutTx = new PaymentTransaction();
        payoutTx.setProfessional(booking.getProfessional());
        payoutTx.setBooking(booking);
        payoutTx.setPayoutRecord(payoutRecord);
        payoutTx.setProvider(provider);
        payoutTx.setTransactionType(PaymentTransactionType.BOOKING_PAYOUT);
        payoutTx.setAmount(payoutRecord.getTargetAmount());
        payoutTx.setCurrency(payoutRecord.getCurrency());
        payoutTx.setStatus(PaymentTransactionStatus.PENDING);
        payoutTx.setExternalReference("payout:" + payoutRecord.getId());
        payoutTx = paymentTransactionRepository.saveAndFlush(payoutTx);

        try {
            ProviderPayoutRequest payoutRequest = buildPayoutRequest(booking, payoutRecord, payoutTx.getId());
            ProviderPayoutResult payoutResult = client.createPayout(payoutRequest);
            payoutTx.setProviderPaymentId(payoutResult.providerPayoutId());
            payoutTx.setProviderStatus(payoutResult.status());
            payoutTx.setPayloadJson(payoutResult.rawResponseJson());

            BookingPayoutRecord updatedRecord;
            if (isPayoutFinalSuccess(payoutResult.status())) {
                payoutTx.setStatus(resolvePayoutTransactionStatus(payoutRecord, payoutResult.amount()));
                payoutTx.setApprovedAt(LocalDateTime.now());
                updatedRecord = bookingFinanceService.markPayoutRecordCompleted(
                    payoutRecord.getId(),
                    provider,
                    payoutResult.providerPayoutId(),
                    payoutResult.amount(),
                    payoutResult.rawResponseJson(),
                    LocalDateTime.now()
                );
            } else if (isPayoutFailure(payoutResult.status())) {
                payoutTx.setStatus(PaymentTransactionStatus.FAILED);
                payoutTx.setFailedAt(LocalDateTime.now());
                updatedRecord = bookingFinanceService.markPayoutRecordFailed(
                    payoutRecord.getId(),
                    provider,
                    payoutResult.providerPayoutId(),
                    payoutResult.rawResponseJson(),
                    LocalDateTime.now()
                );
            } else {
                payoutTx.setStatus(PaymentTransactionStatus.PENDING);
                updatedRecord = bookingFinanceService.markPayoutRecordPendingProvider(
                    payoutRecord.getId(),
                    provider,
                    payoutResult.providerPayoutId(),
                    payoutResult.rawResponseJson()
                );
            }
            paymentTransactionRepository.save(payoutTx);
            BookingFinancialSummary summary = bookingFinanceService.applyPayoutEvidence(booking, updatedRecord);
            return new BookingFinanceUpdateResult(summary, refundRecord, updatedRecord);
        } catch (RuntimeException exception) {
            LOGGER.error("Booking payout initiation failed bookingId={} payoutRecordId={}", booking.getId(), payoutRecord.getId(), exception);
            payoutTx.setStatus(PaymentTransactionStatus.FAILED);
            payoutTx.setFailedAt(LocalDateTime.now());
            payoutTx.setPayloadJson(writeJson(Map.of(
                "error", exception.getMessage(),
                "manualRetry", manualRetry
            )));
            paymentTransactionRepository.save(payoutTx);
            BookingPayoutRecord failed = bookingFinanceService.markPayoutRecordFailed(
                payoutRecord.getId(),
                provider,
                payoutTx.getProviderPaymentId(),
                payoutTx.getPayloadJson(),
                LocalDateTime.now()
            );
            BookingFinancialSummary summary = bookingFinanceService.applyPayoutEvidence(booking, failed);
            return new BookingFinanceUpdateResult(summary, refundRecord, failed);
        }
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
        BookingRefundRecord refundRecord = maybeResolveRefundRecord(saved, event);
        BookingPayoutRecord payoutRecord = maybeResolvePayoutRecord(saved, event);
        if (refundRecord != null) {
            bookingFinanceService.applyRefundEvidence(booking, refundRecord);
            if ((event.eventType() == WebhookEventType.PAYMENT_SUCCEEDED || event.eventType() == WebhookEventType.SUBSCRIPTION_RENEWED)
                && refundRecord.getStatus() == BookingRefundStatus.PENDING_MANUAL) {
                processPostDecision(booking, new BookingFinanceUpdateResult(summary, refundRecord, null));
                refundRecord = bookingFinanceService.findLatestRefundRecord(booking.getId());
            }
        }
        if (payoutRecord != null) {
            bookingFinanceService.applyPayoutEvidence(booking, payoutRecord);
        }

        paymentEvent.setProfessional(booking.getProfessional());
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
            return paymentTransactionRepository.findById(event.orderReference()).orElse(null);
        }
        return null;
    }

    private PaymentTransaction buildWebhookBackfilledCharge(Booking booking, ParsedWebhookEvent event) {
        PaymentTransaction transaction = new PaymentTransaction();
        transaction.setProfessional(booking.getProfessional());
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
        transaction.setProfessional(booking.getProfessional());
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
        transaction.setProfessional(booking.getProfessional());
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
        transaction.setPayloadJson(event.payloadJson());
    }

    private void applyChargeFailed(PaymentTransaction transaction, ParsedWebhookEvent event) {
        transaction.setTransactionType(PaymentTransactionType.BOOKING_CHARGE);
        transaction.setProviderPaymentId(firstNonBlank(transaction.getProviderPaymentId(), event.providerPaymentId(), event.providerObjectId()));
        transaction.setProviderStatus(event.eventType().name());
        transaction.setStatus(PaymentTransactionStatus.FAILED);
        transaction.setFailedAt(event.eventTime() == null ? LocalDateTime.now() : event.eventTime());
        transaction.setPayloadJson(event.payloadJson());
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
        ProfessionalProfile professional = booking.getProfessional();
        if (professional == null || Boolean.FALSE.equals(professional.getDlocalPayoutEnabled())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El profesional no tiene payouts dLocal habilitados");
        }
        requirePayoutField(professional.getDlocalBeneficiaryFirstName(), "dlocal_beneficiary_first_name");
        requirePayoutField(professional.getDlocalBeneficiaryLastName(), "dlocal_beneficiary_last_name");
        requirePayoutField(professional.getDlocalBeneficiaryDocumentType(), "dlocal_beneficiary_document_type");
        requirePayoutField(professional.getDlocalBeneficiaryDocumentNumber(), "dlocal_beneficiary_document_number");
        requirePayoutField(professional.getDlocalBankCode(), "dlocal_bank_code");
        requirePayoutField(professional.getDlocalBankBranch(), "dlocal_bank_branch");
        requirePayoutField(professional.getDlocalBankAccountNumber(), "dlocal_bank_account_number");
        requirePayoutField(professional.getDlocalBankAccountType(), "dlocal_bank_account_type");

        String country = professional.getDlocalPayoutCountry();
        if (country == null || country.isBlank()) {
            country = billingProperties.getDlocal().getCountry();
        }
        return new ProviderPayoutRequest(
            payoutRecord.getId(),
            booking.getId(),
            professional.getId(),
            payoutRecord.getTargetAmount(),
            payoutRecord.getCurrency(),
            country,
            professional.getDlocalBeneficiaryFirstName().trim(),
            professional.getDlocalBeneficiaryLastName().trim(),
            professional.getDlocalBeneficiaryDocumentType().trim(),
            professional.getDlocalBeneficiaryDocumentNumber().trim(),
            professional.getDlocalBankCode().trim(),
            professional.getDlocalBankBranch().trim(),
            professional.getDlocalBankAccountNumber().trim(),
            professional.getDlocalBankAccountType().trim(),
            "OTHER_SERVICES",
            resolveWebhookUrl(PaymentProvider.DLOCAL),
            idempotencyKey
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

    private boolean isPayoutFinalSuccess(String status) {
        String normalized = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
        return "PAID".equals(normalized) || "DELIVERED".equals(normalized);
    }

    private boolean isPayoutFailure(String status) {
        String normalized = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
        return "REJECTED".equals(normalized) || "CANCELLED".equals(normalized);
    }

    private void requirePayoutField(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Falta configuración de payout dLocal para el profesional: " + fieldName
            );
        }
    }

    private PaymentProvider resolveProvider(String rawProvider) {
        if (rawProvider == null || rawProvider.isBlank()) {
            return PaymentProvider.DLOCAL;
        }
        PaymentProvider provider = PaymentProvider.fromCode(rawProvider);
        if (provider != PaymentProvider.DLOCAL) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Por ahora las reservas solo soportan provider DLOCAL para checkout/refund real"
            );
        }
        return provider;
    }

    private PaymentProviderClient resolveProviderClient(PaymentProvider provider) {
        PaymentProviderClient client = providerClients.get(provider);
        if (client == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Provider no configurado");
        }
        return client;
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

    private User loadClient(String rawUserId) {
        Long userId;
        try {
            userId = Long.parseLong(rawUserId);
        } catch (NumberFormatException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesión inválida");
        }
        User user = userRepository.findByIdAndDeletedAtIsNull(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));
        if (user.getRole() != UserRole.USER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo clientes");
        }
        return user;
    }

    private String writeJson(Object payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException exception) {
            return "{\"serializationError\":true}";
        }
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }
}
