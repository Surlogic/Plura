package com.plura.plurabackend.booking.finance;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.billing.payments.model.PaymentTransaction;
import com.plura.plurabackend.billing.payments.model.PaymentProvider;
import com.plura.plurabackend.billing.payments.model.PaymentTransactionStatus;
import com.plura.plurabackend.billing.payments.model.PaymentTransactionType;
import com.plura.plurabackend.billing.payments.repository.PaymentTransactionRepository;
import com.plura.plurabackend.booking.decision.model.BookingActionDecision;
import com.plura.plurabackend.booking.decision.model.BookingActionType;
import com.plura.plurabackend.booking.decision.repository.BookingActionDecisionRepository;
import com.plura.plurabackend.booking.dto.BookingFinancialSummaryResponse;
import com.plura.plurabackend.booking.dto.BookingPayoutRecordResponse;
import com.plura.plurabackend.booking.dto.BookingRefundRecordResponse;
import com.plura.plurabackend.booking.event.model.BookingActorType;
import com.plura.plurabackend.booking.finance.model.BookingFinancialStatus;
import com.plura.plurabackend.booking.finance.model.BookingFinancialSummary;
import com.plura.plurabackend.booking.finance.model.BookingPayoutReasonCode;
import com.plura.plurabackend.booking.finance.model.BookingPayoutRecord;
import com.plura.plurabackend.booking.finance.model.BookingPayoutStatus;
import com.plura.plurabackend.booking.finance.model.BookingRefundReasonCode;
import com.plura.plurabackend.booking.finance.model.BookingRefundRecord;
import com.plura.plurabackend.booking.finance.model.BookingRefundStatus;
import com.plura.plurabackend.booking.finance.repository.BookingFinancialSummaryRepository;
import com.plura.plurabackend.booking.finance.repository.BookingPayoutRecordRepository;
import com.plura.plurabackend.booking.finance.repository.BookingRefundRecordRepository;
import com.plura.plurabackend.booking.model.Booking;
import com.plura.plurabackend.booking.model.BookingOperationalStatus;
import java.math.BigDecimal;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookingFinanceService {

    private final BookingFinancialSummaryRepository bookingFinancialSummaryRepository;
    private final BookingRefundRecordRepository bookingRefundRecordRepository;
    private final BookingPayoutRecordRepository bookingPayoutRecordRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final BookingActionDecisionRepository bookingActionDecisionRepository;
    private final BookingMoneyResolver bookingMoneyResolver;
    private final ObjectMapper objectMapper;

    public BookingFinanceService(
        BookingFinancialSummaryRepository bookingFinancialSummaryRepository,
        BookingRefundRecordRepository bookingRefundRecordRepository,
        BookingPayoutRecordRepository bookingPayoutRecordRepository,
        PaymentTransactionRepository paymentTransactionRepository,
        BookingActionDecisionRepository bookingActionDecisionRepository,
        BookingMoneyResolver bookingMoneyResolver,
        ObjectMapper objectMapper
    ) {
        this.bookingFinancialSummaryRepository = bookingFinancialSummaryRepository;
        this.bookingRefundRecordRepository = bookingRefundRecordRepository;
        this.bookingPayoutRecordRepository = bookingPayoutRecordRepository;
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.bookingActionDecisionRepository = bookingActionDecisionRepository;
        this.bookingMoneyResolver = bookingMoneyResolver;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public BookingFinancialSummary ensureInitialized(Booking booking) {
        return bookingFinancialSummaryRepository.findByBooking_Id(booking.getId())
            .orElseGet(() -> bookingFinancialSummaryRepository.save(buildInitialSummary(booking)));
    }

    @Transactional
    public BookingFinanceUpdateResult applyDecision(
        Booking booking,
        BookingActionDecision decision
    ) {
        BookingFinancialSummary summary = ensureInitializedWithEvidence(booking);
        BookingRefundRecord refundRecord = null;
        BigDecimal refundTarget = bookingMoneyResolver.normalizeAmount(decision.getRefundPreviewAmount());
        BigDecimal retainTarget = bookingMoneyResolver.normalizeAmount(decision.getRetainPreviewAmount());
        BookingPayoutRecord payoutRecord = null;

        summary.setLastDecisionId(decision.getId());
        summary.setCurrency(decision.getCurrency());

        if (refundTarget.signum() > 0) {
            refundRecord = bookingRefundRecordRepository.findByRelatedDecisionId(decision.getId())
                .orElseGet(() -> createRefundRecord(
                    booking,
                    decision,
                    refundTarget,
                    resolveRefundReasonCode(decision)
                ));
        }

        BigDecimal releaseTarget = resolveReleaseTarget(booking, decision, summary, refundTarget, retainTarget);
        if (releaseTarget.signum() > 0) {
            payoutRecord = bookingPayoutRecordRepository.findByRelatedDecisionId(decision.getId())
                .orElseGet(() -> createPayoutRecord(
                    booking,
                    decision,
                    releaseTarget,
                    resolvePayoutReasonCode(decision)
                ));
        }

        BookingFinancialSummary savedSummary = bookingFinancialSummaryRepository.save(recalculateFromEvidence(summary));
        return new BookingFinanceUpdateResult(savedSummary, refundRecord, payoutRecord);
    }

    @Transactional
    public BookingFinancialSummary ensureInitializedWithEvidence(Booking booking) {
        BookingFinancialSummary summary = ensureInitialized(booking);
        return bookingFinancialSummaryRepository.save(recalculateFromEvidence(summary));
    }

    @Transactional
    public BookingFinancialSummary applyExternalPaymentEvidence(
        Booking booking,
        PaymentTransaction paymentTransaction
    ) {
        BookingFinancialSummary summary = ensureInitialized(booking);
        if (paymentTransaction != null && paymentTransaction.getCurrency() != null && !paymentTransaction.getCurrency().isBlank()) {
            summary.setCurrency(paymentTransaction.getCurrency().trim().toUpperCase());
        }
        return bookingFinancialSummaryRepository.save(recalculateFromEvidence(summary));
    }

    @Transactional
    public BookingFinancialSummary applyRefundEvidence(
        Booking booking,
        BookingRefundRecord refundRecord
    ) {
        BookingFinancialSummary summary = ensureInitialized(booking);
        if (refundRecord != null && refundRecord.getCurrency() != null && !refundRecord.getCurrency().isBlank()) {
            summary.setCurrency(refundRecord.getCurrency().trim().toUpperCase());
        }
        return bookingFinancialSummaryRepository.save(recalculateFromEvidence(summary));
    }

    @Transactional
    public BookingFinancialSummary applyPayoutEvidence(
        Booking booking,
        BookingPayoutRecord payoutRecord
    ) {
        BookingFinancialSummary summary = ensureInitialized(booking);
        if (payoutRecord != null && payoutRecord.getCurrency() != null && !payoutRecord.getCurrency().isBlank()) {
            summary.setCurrency(payoutRecord.getCurrency().trim().toUpperCase());
        }
        return bookingFinancialSummaryRepository.save(recalculateFromEvidence(summary));
    }

    @Transactional
    public BookingRefundRecord markRefundRecordPendingProvider(
        String refundRecordId,
        String providerReference
    ) {
        BookingRefundRecord refundRecord = bookingRefundRecordRepository.findById(refundRecordId)
            .orElseThrow(() -> new IllegalStateException("Refund record no encontrado"));
        refundRecord.setStatus(BookingRefundStatus.PENDING_PROVIDER);
        refundRecord.setProviderReference(providerReference);
        return bookingRefundRecordRepository.save(refundRecord);
    }

    @Transactional
    public BookingRefundRecord markRefundRecordCompleted(
        String refundRecordId,
        String providerReference
    ) {
        BookingRefundRecord refundRecord = bookingRefundRecordRepository.findById(refundRecordId)
            .orElseThrow(() -> new IllegalStateException("Refund record no encontrado"));
        refundRecord.setStatus(BookingRefundStatus.COMPLETED);
        if (providerReference != null && !providerReference.isBlank()) {
            refundRecord.setProviderReference(providerReference);
        }
        return bookingRefundRecordRepository.save(refundRecord);
    }

    @Transactional
    public BookingRefundRecord markRefundRecordFailed(
        String refundRecordId,
        String providerReference
    ) {
        BookingRefundRecord refundRecord = bookingRefundRecordRepository.findById(refundRecordId)
            .orElseThrow(() -> new IllegalStateException("Refund record no encontrado"));
        refundRecord.setStatus(BookingRefundStatus.FAILED);
        if (providerReference != null && !providerReference.isBlank()) {
            refundRecord.setProviderReference(providerReference);
        }
        return bookingRefundRecordRepository.save(refundRecord);
    }

    @Transactional
    public BookingPayoutRecord markPayoutRecordPendingProvider(
        String payoutRecordId,
        PaymentProvider provider,
        String providerReference,
        String payloadJson
    ) {
        BookingPayoutRecord payoutRecord = bookingPayoutRecordRepository.findById(payoutRecordId)
            .orElseThrow(() -> new IllegalStateException("Payout record no encontrado"));
        payoutRecord.setStatus(BookingPayoutStatus.PENDING_PROVIDER);
        payoutRecord.setProvider(provider);
        payoutRecord.setProviderReference(providerReference);
        if (payloadJson != null && !payloadJson.isBlank()) {
            payoutRecord.setPayloadJson(payloadJson);
        }
        return bookingPayoutRecordRepository.save(payoutRecord);
    }

    @Transactional
    public BookingPayoutRecord markPayoutRecordCompleted(
        String payoutRecordId,
        PaymentProvider provider,
        String providerReference,
        BigDecimal releasedAmount,
        String payloadJson,
        java.time.LocalDateTime executedAt
    ) {
        BookingPayoutRecord payoutRecord = bookingPayoutRecordRepository.findById(payoutRecordId)
            .orElseThrow(() -> new IllegalStateException("Payout record no encontrado"));
        payoutRecord.setStatus(BookingPayoutStatus.COMPLETED);
        payoutRecord.setProvider(provider);
        payoutRecord.setReleasedAmount(bookingMoneyResolver.normalizeAmount(
            releasedAmount == null ? payoutRecord.getTargetAmount() : releasedAmount
        ));
        payoutRecord.setExecutedAt(executedAt == null ? java.time.LocalDateTime.now() : executedAt);
        if (providerReference != null && !providerReference.isBlank()) {
            payoutRecord.setProviderReference(providerReference);
        }
        if (payloadJson != null && !payloadJson.isBlank()) {
            payoutRecord.setPayloadJson(payloadJson);
        }
        return bookingPayoutRecordRepository.save(payoutRecord);
    }

    @Transactional
    public BookingPayoutRecord markPayoutRecordFailed(
        String payoutRecordId,
        PaymentProvider provider,
        String providerReference,
        String payloadJson,
        java.time.LocalDateTime failedAt
    ) {
        BookingPayoutRecord payoutRecord = bookingPayoutRecordRepository.findById(payoutRecordId)
            .orElseThrow(() -> new IllegalStateException("Payout record no encontrado"));
        payoutRecord.setStatus(BookingPayoutStatus.FAILED);
        payoutRecord.setProvider(provider);
        payoutRecord.setFailedAt(failedAt == null ? java.time.LocalDateTime.now() : failedAt);
        if (providerReference != null && !providerReference.isBlank()) {
            payoutRecord.setProviderReference(providerReference);
        }
        if (payloadJson != null && !payloadJson.isBlank()) {
            payoutRecord.setPayloadJson(payloadJson);
        }
        return bookingPayoutRecordRepository.save(payoutRecord);
    }

    public BookingFinancialSummaryResponse toResponse(BookingFinancialSummary summary) {
        if (summary == null) {
            return null;
        }
        return new BookingFinancialSummaryResponse(
            summary.getAmountCharged(),
            summary.getAmountHeld(),
            summary.getAmountToRefund(),
            summary.getAmountRefunded(),
            summary.getAmountToRelease(),
            summary.getAmountReleased(),
            summary.getCurrency(),
            summary.getFinancialStatus() == null ? null : summary.getFinancialStatus().name(),
            summary.getLastDecisionId(),
            summary.getUpdatedAt()
        );
    }

    public Map<Long, BookingFinancialSummaryResponse> findResponseMapByBookingIds(Collection<Long> bookingIds) {
        if (bookingIds == null || bookingIds.isEmpty()) {
            return Collections.emptyMap();
        }

        return bookingFinancialSummaryRepository.findByBooking_IdIn(bookingIds).stream()
            .filter(summary -> summary.getBooking() != null && summary.getBooking().getId() != null)
            .collect(Collectors.toMap(
                summary -> summary.getBooking().getId(),
                this::toResponse,
                (left, right) -> right
            ));
    }

    public BookingRefundRecordResponse toResponse(BookingRefundRecord refundRecord) {
        if (refundRecord == null) {
            return null;
        }
        return new BookingRefundRecordResponse(
            refundRecord.getId(),
            refundRecord.getActorType() == null ? null : refundRecord.getActorType().name(),
            refundRecord.getActorUserId(),
            refundRecord.getRequestedAmount(),
            refundRecord.getTargetAmount(),
            refundRecord.getStatus() == null ? null : refundRecord.getStatus().name(),
            refundRecord.getReasonCode() == null ? null : refundRecord.getReasonCode().name(),
            refundRecord.getCurrency(),
            refundRecord.getProviderReference(),
            refundRecord.getRelatedDecisionId(),
            refundRecord.getCreatedAt(),
            refundRecord.getUpdatedAt()
        );
    }

    public BookingPayoutRecordResponse toResponse(BookingPayoutRecord payoutRecord) {
        if (payoutRecord == null) {
            return null;
        }
        return new BookingPayoutRecordResponse(
            payoutRecord.getId(),
            payoutRecord.getProfessional() == null ? null : payoutRecord.getProfessional().getId(),
            payoutRecord.getTargetAmount(),
            payoutRecord.getReleasedAmount(),
            payoutRecord.getCurrency(),
            payoutRecord.getStatus() == null ? null : payoutRecord.getStatus().name(),
            payoutRecord.getReasonCode() == null ? null : payoutRecord.getReasonCode().name(),
            payoutRecord.getProvider() == null ? null : payoutRecord.getProvider().name(),
            payoutRecord.getProviderReference(),
            payoutRecord.getRelatedDecisionId(),
            payoutRecord.getCreatedAt(),
            payoutRecord.getUpdatedAt(),
            payoutRecord.getExecutedAt(),
            payoutRecord.getFailedAt()
        );
    }

    public BookingRefundRecord findLatestRefundRecord(Long bookingId) {
        return bookingRefundRecordRepository.findTopByBooking_IdOrderByCreatedAtDesc(bookingId).orElse(null);
    }

    public BookingPayoutRecord findLatestPayoutRecord(Long bookingId) {
        return bookingPayoutRecordRepository.findTopByBooking_IdOrderByCreatedAtDesc(bookingId).orElse(null);
    }

    public BookingRefundRecord findByProviderReference(String providerReference) {
        if (providerReference == null || providerReference.isBlank()) {
            return null;
        }
        return bookingRefundRecordRepository.findByProviderReference(providerReference).orElse(null);
    }

    public BookingRefundRecord findById(String refundRecordId) {
        if (refundRecordId == null || refundRecordId.isBlank()) {
            return null;
        }
        return bookingRefundRecordRepository.findById(refundRecordId).orElse(null);
    }

    public BookingPayoutRecord findPayoutByProviderReference(String providerReference) {
        if (providerReference == null || providerReference.isBlank()) {
            return null;
        }
        return bookingPayoutRecordRepository.findByProviderReference(providerReference).orElse(null);
    }

    public BookingPayoutRecord findPayoutById(String payoutRecordId) {
        if (payoutRecordId == null || payoutRecordId.isBlank()) {
            return null;
        }
        return bookingPayoutRecordRepository.findById(payoutRecordId).orElse(null);
    }

    public BookingFinancialEvidenceSnapshot inspectEvidenceState(Booking booking) {
        List<PaymentTransaction> chargeTransactions = paymentTransactionRepository.findByBooking_IdAndTransactionTypeOrderByCreatedAtAsc(
            booking.getId(),
            PaymentTransactionType.BOOKING_CHARGE
        );
        List<PaymentTransaction> refundTransactions = paymentTransactionRepository.findByBooking_IdAndTransactionTypeOrderByCreatedAtAsc(
            booking.getId(),
            PaymentTransactionType.BOOKING_REFUND
        );
        List<PaymentTransaction> payoutTransactions = paymentTransactionRepository.findByBooking_IdAndTransactionTypeOrderByCreatedAtAsc(
            booking.getId(),
            PaymentTransactionType.BOOKING_PAYOUT
        );
        List<BookingRefundRecord> refundRecords = bookingRefundRecordRepository.findByBooking_IdOrderByCreatedAtDesc(booking.getId());
        List<BookingPayoutRecord> payoutRecords = bookingPayoutRecordRepository.findByBooking_IdOrderByCreatedAtDesc(booking.getId());

        BigDecimal totalCharged = sumAmounts(filterSuccessfulTransactions(chargeTransactions));
        BigDecimal totalRefunded = sumAmounts(filterRefundTransactions(refundTransactions));
        BigDecimal totalReleased = sumAmounts(filterPayoutTransactions(payoutTransactions));
        boolean hasFailedCharge = chargeTransactions.stream()
            .anyMatch(transaction -> transaction.getStatus() == PaymentTransactionStatus.FAILED);
        boolean hasFailedRefund = refundRecords.stream()
            .anyMatch(refund -> refund.getStatus() == BookingRefundStatus.FAILED);
        boolean hasFailedPayout = payoutRecords.stream()
            .anyMatch(payout -> payout.getStatus() == BookingPayoutStatus.FAILED);

        BigDecimal amountHeld = totalCharged.subtract(totalRefunded).subtract(totalReleased).max(BigDecimal.ZERO);
        BigDecimal openRefundTarget = refundRecords.stream()
            .filter(refund -> refund.getStatus() == BookingRefundStatus.PENDING_MANUAL
                || refund.getStatus() == BookingRefundStatus.PENDING_PROVIDER)
            .map(BookingRefundRecord::getTargetAmount)
            .map(bookingMoneyResolver::normalizeAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal openReleaseTarget = payoutRecords.stream()
            .filter(payout -> payout.getStatus() == BookingPayoutStatus.PENDING_MANUAL
                || payout.getStatus() == BookingPayoutStatus.PENDING_PROVIDER)
            .map(BookingPayoutRecord::getTargetAmount)
            .map(bookingMoneyResolver::normalizeAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new BookingFinancialEvidenceSnapshot(
            totalCharged,
            amountHeld,
            openRefundTarget,
            totalRefunded,
            openReleaseTarget,
            totalReleased,
            resolveFinancialStatus(
                booking,
                totalCharged,
                totalRefunded,
                totalReleased,
                openRefundTarget,
                openReleaseTarget,
                hasFailedCharge,
                hasFailedRefund,
                hasFailedPayout
            ),
            hasFailedCharge,
            hasFailedRefund,
            hasFailedPayout
        );
    }

    private BookingFinancialSummary buildInitialSummary(Booking booking) {
        BookingFinancialSummary summary = new BookingFinancialSummary();
        summary.setBooking(booking);
        summary.setAmountCharged(BigDecimal.ZERO);
        summary.setAmountHeld(BigDecimal.ZERO);
        summary.setAmountToRefund(BigDecimal.ZERO);
        summary.setAmountRefunded(BigDecimal.ZERO);
        summary.setAmountToRelease(BigDecimal.ZERO);
        summary.setAmountReleased(BigDecimal.ZERO);
        summary.setCurrency(bookingMoneyResolver.resolveCurrency(booking));
        summary.setFinancialStatus(resolveInitialStatus(booking));
        return summary;
    }

    private BookingFinancialStatus resolveInitialStatus(Booking booking) {
        BigDecimal expectedPrepaid = bookingMoneyResolver.resolvePrepaidAmount(booking);
        return expectedPrepaid.signum() > 0
            ? BookingFinancialStatus.PAYMENT_PENDING
            : BookingFinancialStatus.NOT_REQUIRED;
    }

    private BookingRefundRecord createRefundRecord(
        Booking booking,
        BookingActionDecision decision,
        BigDecimal refundTarget,
        BookingRefundReasonCode reasonCode
    ) {
        BookingRefundRecord refundRecord = new BookingRefundRecord();
        refundRecord.setBooking(booking);
        refundRecord.setActorType(decision.getActorType());
        refundRecord.setActorUserId(decision.getActorUserId());
        refundRecord.setRequestedAmount(refundTarget);
        refundRecord.setTargetAmount(refundTarget);
        refundRecord.setStatus(BookingRefundStatus.PENDING_MANUAL);
        refundRecord.setReasonCode(reasonCode);
        refundRecord.setCurrency(decision.getCurrency());
        refundRecord.setRelatedDecisionId(decision.getId());
        refundRecord.setMetadataJson(writeMetadataJson(booking, decision));
        return bookingRefundRecordRepository.save(refundRecord);
    }

    private BookingRefundReasonCode resolveRefundReasonCode(BookingActionDecision decision) {
        if (decision.getActionType() == BookingActionType.CANCEL) {
            return decision.getActorType() == BookingActorType.PROFESSIONAL
                ? BookingRefundReasonCode.PROFESSIONAL_CANCELLATION
                : BookingRefundReasonCode.CLIENT_CANCELLATION;
        }
        return BookingRefundReasonCode.OTHER;
    }

    private BookingPayoutRecord createPayoutRecord(
        Booking booking,
        BookingActionDecision decision,
        BigDecimal releaseTarget,
        BookingPayoutReasonCode reasonCode
    ) {
        BookingPayoutRecord payoutRecord = new BookingPayoutRecord();
        payoutRecord.setBooking(booking);
        payoutRecord.setProfessional(booking.getProfessional());
        payoutRecord.setTargetAmount(releaseTarget);
        payoutRecord.setReleasedAmount(BigDecimal.ZERO);
        payoutRecord.setCurrency(decision.getCurrency());
        payoutRecord.setStatus(BookingPayoutStatus.PENDING_MANUAL);
        payoutRecord.setReasonCode(reasonCode);
        payoutRecord.setRelatedDecisionId(decision.getId());
        payoutRecord.setPayloadJson(writeMetadataJson(booking, decision));
        return bookingPayoutRecordRepository.save(payoutRecord);
    }

    private BookingPayoutReasonCode resolvePayoutReasonCode(BookingActionDecision decision) {
        return switch (decision.getActionType()) {
            case COMPLETE -> BookingPayoutReasonCode.BOOKING_COMPLETED;
            case NO_SHOW -> BookingPayoutReasonCode.CLIENT_NO_SHOW;
            case CANCEL -> BookingPayoutReasonCode.CLIENT_LATE_CANCELLATION;
            case RESCHEDULE, RETRY_PAYOUT -> BookingPayoutReasonCode.OTHER;
        };
    }

    private BigDecimal resolveReleaseTarget(
        Booking booking,
        BookingActionDecision decision,
        BookingFinancialSummary summary,
        BigDecimal refundTarget,
        BigDecimal retainTarget
    ) {
        BigDecimal currentlyHeld = bookingMoneyResolver.normalizeAmount(summary.getAmountHeld());
        if (currentlyHeld.signum() <= 0) {
            return BigDecimal.ZERO;
        }
        if (refundTarget.signum() > 0) {
            return BigDecimal.ZERO;
        }
        return switch (decision.getActionType()) {
            case CANCEL -> retainTarget.signum() > 0 ? retainTarget.min(currentlyHeld) : BigDecimal.ZERO;
            case NO_SHOW -> retainTarget.signum() > 0 ? retainTarget.min(currentlyHeld) : BigDecimal.ZERO;
            case COMPLETE -> booking.getOperationalStatus() == BookingOperationalStatus.COMPLETED
                ? currentlyHeld
                : BigDecimal.ZERO;
            case RESCHEDULE, RETRY_PAYOUT -> BigDecimal.ZERO;
        };
    }

    private String writeMetadataJson(Booking booking, BookingActionDecision decision) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("bookingId", booking.getId());
        metadata.put("bookingStatus", booking.getOperationalStatus().name());
        metadata.put("relatedDecisionId", decision.getId());
        metadata.put("financialOutcomeCode", decision.getFinancialOutcomeCode());
        metadata.put("decisionSnapshotJson", decision.getDecisionSnapshotJson());
        try {
            return objectMapper.writeValueAsString(metadata);
        } catch (JsonProcessingException exception) {
            return "{\"serializationError\":true}";
        }
    }

    private BookingFinancialSummary recalculateFromEvidence(BookingFinancialSummary summary) {
        Booking booking = summary.getBooking();
        BookingFinancialEvidenceSnapshot evidence = inspectEvidenceState(booking);
        summary.setAmountCharged(evidence.amountCharged());
        summary.setAmountHeld(evidence.amountHeld());
        summary.setAmountToRefund(evidence.amountToRefund());
        summary.setAmountRefunded(evidence.amountRefunded());
        summary.setAmountToRelease(evidence.amountToRelease());
        summary.setAmountReleased(evidence.amountReleased());
        summary.setFinancialStatus(evidence.financialStatus());
        return summary;
    }

    private BookingFinancialStatus resolveFinancialStatus(
        Booking booking,
        BigDecimal totalCharged,
        BigDecimal totalRefunded,
        BigDecimal totalReleased,
        BigDecimal openRefundTarget,
        BigDecimal openReleaseTarget,
        boolean hasFailedCharge,
        boolean hasFailedRefund,
        boolean hasFailedPayout
    ) {
        if (openRefundTarget.signum() > 0) {
            return BookingFinancialStatus.REFUND_PENDING;
        }

        if (openReleaseTarget.signum() > 0) {
            return BookingFinancialStatus.RELEASE_PENDING;
        }

        if (hasFailedRefund || hasFailedPayout) {
            return BookingFinancialStatus.FAILED;
        }

        if (totalReleased.signum() > 0) {
            BigDecimal releasableBase = totalCharged.subtract(totalRefunded).max(BigDecimal.ZERO);
            return totalReleased.compareTo(releasableBase) < 0
                ? BookingFinancialStatus.PARTIALLY_RELEASED
                : BookingFinancialStatus.RELEASED;
        }

        if (totalRefunded.signum() > 0 && totalRefunded.compareTo(totalCharged) < 0) {
            return BookingFinancialStatus.PARTIALLY_REFUNDED;
        }

        if (totalRefunded.signum() > 0 && totalRefunded.compareTo(totalCharged) >= 0) {
            return BookingFinancialStatus.REFUNDED;
        }

        if (resolveInitialStatus(booking) == BookingFinancialStatus.PAYMENT_PENDING
            && totalCharged.signum() == 0
            && hasFailedCharge) {
            return BookingFinancialStatus.FAILED;
        }

        return resolveInitialStatus(booking) == BookingFinancialStatus.PAYMENT_PENDING && totalCharged.signum() == 0
            ? BookingFinancialStatus.PAYMENT_PENDING
            : totalCharged.signum() > 0
                ? BookingFinancialStatus.HELD
                : BookingFinancialStatus.NOT_REQUIRED;
    }

    private List<PaymentTransaction> filterSuccessfulTransactions(List<PaymentTransaction> transactions) {
        return transactions.stream()
            .filter(transaction -> transaction.getStatus() == PaymentTransactionStatus.APPROVED
                || transaction.getStatus() == PaymentTransactionStatus.PARTIALLY_REFUNDED
                || transaction.getStatus() == PaymentTransactionStatus.PARTIALLY_RELEASED
                || transaction.getStatus() == PaymentTransactionStatus.REFUNDED)
            .toList();
    }

    private List<PaymentTransaction> filterRefundTransactions(List<PaymentTransaction> transactions) {
        return transactions.stream()
            .filter(transaction -> transaction.getStatus() == PaymentTransactionStatus.APPROVED
                || transaction.getStatus() == PaymentTransactionStatus.PARTIALLY_REFUNDED
                || transaction.getStatus() == PaymentTransactionStatus.REFUNDED)
            .toList();
    }

    private List<PaymentTransaction> filterPayoutTransactions(List<PaymentTransaction> transactions) {
        return transactions.stream()
            .filter(transaction -> transaction.getStatus() == PaymentTransactionStatus.APPROVED
                || transaction.getStatus() == PaymentTransactionStatus.PARTIALLY_RELEASED)
            .toList();
    }

    private BigDecimal sumAmounts(List<PaymentTransaction> transactions) {
        return transactions.stream()
            .map(PaymentTransaction::getAmount)
            .map(bookingMoneyResolver::normalizeAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

}
