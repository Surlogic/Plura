package com.plura.plurabackend.core.booking.ops;

import com.plura.plurabackend.core.billing.payments.model.PaymentEvent;
import com.plura.plurabackend.core.billing.payments.model.PaymentTransaction;
import com.plura.plurabackend.core.billing.payments.model.PaymentTransactionStatus;
import com.plura.plurabackend.core.billing.payments.model.PaymentTransactionType;
import com.plura.plurabackend.core.billing.payments.repository.PaymentEventRepository;
import com.plura.plurabackend.core.billing.payments.repository.PaymentTransactionRepository;
import com.plura.plurabackend.core.booking.decision.BookingActionDecisionService;
import com.plura.plurabackend.core.booking.decision.repository.BookingActionDecisionRepository;
import com.plura.plurabackend.core.booking.dto.BookingActionDecisionResponse;
import com.plura.plurabackend.core.booking.dto.BookingFinancialSummaryResponse;
import com.plura.plurabackend.core.booking.dto.BookingPayoutRecordResponse;
import com.plura.plurabackend.core.booking.dto.BookingRefundRecordResponse;
import com.plura.plurabackend.core.booking.dto.ProfessionalBookingResponse;
import com.plura.plurabackend.core.booking.event.BookingEventService;
import com.plura.plurabackend.core.booking.event.model.BookingActorType;
import com.plura.plurabackend.core.booking.event.model.BookingEvent;
import com.plura.plurabackend.core.booking.event.model.BookingEventType;
import com.plura.plurabackend.core.booking.event.repository.BookingEventRepository;
import com.plura.plurabackend.core.booking.finance.BookingFinancialEvidenceSnapshot;
import com.plura.plurabackend.core.booking.finance.BookingFinanceDispatchPlan;
import com.plura.plurabackend.core.booking.finance.BookingFinanceService;
import com.plura.plurabackend.core.booking.finance.BookingFinanceUpdateResult;
import com.plura.plurabackend.core.booking.finance.BookingMoneyResolver;
import com.plura.plurabackend.core.booking.finance.BookingProviderIntegrationService;
import com.plura.plurabackend.core.booking.finance.model.BookingFinancialStatus;
import com.plura.plurabackend.core.booking.finance.model.BookingFinancialSummary;
import com.plura.plurabackend.core.booking.finance.model.BookingPayoutRecord;
import com.plura.plurabackend.core.booking.finance.model.BookingPayoutStatus;
import com.plura.plurabackend.core.booking.finance.model.BookingRefundRecord;
import com.plura.plurabackend.core.booking.finance.model.BookingRefundStatus;
import com.plura.plurabackend.core.booking.finance.repository.BookingFinancialSummaryRepository;
import com.plura.plurabackend.core.booking.finance.repository.BookingPayoutRecordRepository;
import com.plura.plurabackend.core.booking.finance.repository.BookingRefundRecordRepository;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.core.booking.ops.dto.InternalBookingAlertsResponse;
import com.plura.plurabackend.core.booking.ops.dto.InternalBookingConsistencyIssueResponse;
import com.plura.plurabackend.core.booking.ops.dto.InternalBookingEventResponse;
import com.plura.plurabackend.core.booking.ops.dto.InternalBookingIssueResponse;
import com.plura.plurabackend.core.booking.ops.dto.InternalBookingOpsActionResponse;
import com.plura.plurabackend.core.booking.ops.dto.InternalBookingOpsDetailResponse;
import com.plura.plurabackend.core.booking.ops.dto.InternalPaymentEventResponse;
import com.plura.plurabackend.core.booking.ops.dto.InternalPaymentTransactionResponse;
import com.plura.plurabackend.core.booking.repository.BookingRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class InternalBookingOpsService {

    private final BookingRepository bookingRepository;
    private final BookingFinancialSummaryRepository bookingFinancialSummaryRepository;
    private final BookingRefundRecordRepository bookingRefundRecordRepository;
    private final BookingPayoutRecordRepository bookingPayoutRecordRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final PaymentEventRepository paymentEventRepository;
    private final BookingEventRepository bookingEventRepository;
    private final BookingActionDecisionRepository bookingActionDecisionRepository;
    private final BookingActionDecisionService bookingActionDecisionService;
    private final BookingFinanceService bookingFinanceService;
    private final BookingProviderIntegrationService bookingProviderIntegrationService;
    private final BookingEventService bookingEventService;
    private final BookingMoneyResolver bookingMoneyResolver;

    public InternalBookingOpsService(
        BookingRepository bookingRepository,
        BookingFinancialSummaryRepository bookingFinancialSummaryRepository,
        BookingRefundRecordRepository bookingRefundRecordRepository,
        BookingPayoutRecordRepository bookingPayoutRecordRepository,
        PaymentTransactionRepository paymentTransactionRepository,
        PaymentEventRepository paymentEventRepository,
        BookingEventRepository bookingEventRepository,
        BookingActionDecisionRepository bookingActionDecisionRepository,
        BookingActionDecisionService bookingActionDecisionService,
        BookingFinanceService bookingFinanceService,
        BookingProviderIntegrationService bookingProviderIntegrationService,
        BookingEventService bookingEventService,
        BookingMoneyResolver bookingMoneyResolver
    ) {
        this.bookingRepository = bookingRepository;
        this.bookingFinancialSummaryRepository = bookingFinancialSummaryRepository;
        this.bookingRefundRecordRepository = bookingRefundRecordRepository;
        this.bookingPayoutRecordRepository = bookingPayoutRecordRepository;
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.paymentEventRepository = paymentEventRepository;
        this.bookingEventRepository = bookingEventRepository;
        this.bookingActionDecisionRepository = bookingActionDecisionRepository;
        this.bookingActionDecisionService = bookingActionDecisionService;
        this.bookingFinanceService = bookingFinanceService;
        this.bookingProviderIntegrationService = bookingProviderIntegrationService;
        this.bookingEventService = bookingEventService;
        this.bookingMoneyResolver = bookingMoneyResolver;
    }

    @Transactional(readOnly = true)
    public InternalBookingAlertsResponse getAlerts(long olderThanMinutes, long heldOlderThanMinutes) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime pendingCutoff = now.minusMinutes(Math.max(1L, olderThanMinutes));
        LocalDateTime heldCutoff = now.minusMinutes(Math.max(1L, heldOlderThanMinutes));

        List<InternalBookingIssueResponse> stalePaymentPending = bookingFinancialSummaryRepository
            .findByFinancialStatusAndUpdatedAtBefore(BookingFinancialStatus.PAYMENT_PENDING, pendingCutoff)
            .stream()
            .map(summary -> issueFromSummary(summary, "PAYMENT_PENDING_STALE", "Cobro pendiente sin resolución reciente"))
            .toList();

        List<InternalBookingIssueResponse> staleHeld = bookingFinancialSummaryRepository
            .findByFinancialStatusAndUpdatedAtBefore(BookingFinancialStatus.HELD, heldCutoff)
            .stream()
            .map(summary -> issueFromSummary(summary, "HELD_STALE", "Fondos retenidos demasiado tiempo sin refund o payout"))
            .toList();

        List<InternalBookingIssueResponse> staleRefundPending = bookingFinancialSummaryRepository
            .findByFinancialStatusAndUpdatedAtBefore(BookingFinancialStatus.REFUND_PENDING, pendingCutoff)
            .stream()
            .map(summary -> issueFromSummary(summary, "REFUND_PENDING_STALE", "Refund pendiente sin resolución reciente"))
            .toList();

        List<InternalBookingIssueResponse> staleReleasePending = bookingFinancialSummaryRepository
            .findByFinancialStatusAndUpdatedAtBefore(BookingFinancialStatus.RELEASE_PENDING, pendingCutoff)
            .stream()
            .map(summary -> issueFromSummary(summary, "RELEASE_PENDING_STALE", "Payout pendiente sin resolución reciente"))
            .toList();

        List<InternalBookingIssueResponse> failedRefunds = distinctIssuesByBooking(
            bookingRefundRecordRepository.findByStatus(BookingRefundStatus.FAILED).stream()
                .filter(refund -> refund.getStatus() == BookingRefundStatus.FAILED)
                .map(this::failedRefundIssue)
                .filter(Objects::nonNull)
                .toList()
        );

        List<InternalBookingIssueResponse> failedPayouts = distinctIssuesByBooking(
            bookingPayoutRecordRepository.findByStatus(BookingPayoutStatus.FAILED).stream()
                .filter(payout -> payout.getStatus() == BookingPayoutStatus.FAILED)
                .map(this::failedPayoutIssue)
                .filter(Objects::nonNull)
                .toList()
        );

        Set<Long> candidateBookingIds = new LinkedHashSet<>();
        candidateBookingIds.addAll(
            bookingFinancialSummaryRepository.findBookingIdsByFinancialStatusNot(BookingFinancialStatus.NOT_REQUIRED)
        );
        candidateBookingIds.addAll(paymentTransactionRepository.findDistinctBookingIds());
        candidateBookingIds.addAll(bookingRefundRecordRepository.findDistinctBookingIds());
        candidateBookingIds.addAll(bookingPayoutRecordRepository.findDistinctBookingIds());

        List<InternalBookingIssueResponse> inconsistentBookings = candidateBookingIds.stream()
            .map(bookingId -> bookingRepository.findDetailedById(bookingId).orElse(null))
            .filter(Objects::nonNull)
            .map(this::inconsistencyIssue)
            .filter(Objects::nonNull)
            .sorted(Comparator.comparing(InternalBookingIssueResponse::summaryUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .toList();

        return new InternalBookingAlertsResponse(
            stalePaymentPending,
            staleHeld,
            staleRefundPending,
            staleReleasePending,
            failedRefunds,
            failedPayouts,
            inconsistentBookings
        );
    }

    @Transactional(readOnly = true)
    public InternalBookingOpsDetailResponse getBookingDetail(Long bookingId) {
        Booking booking = loadBooking(bookingId, false);
        return buildDetail(booking);
    }

    @Transactional
    public InternalBookingOpsActionResponse retryRefund(Long bookingId) {
        Booking booking = loadBooking(bookingId, true);
        BookingRefundRecord refundRecord = bookingFinanceService.findLatestRefundRecord(bookingId);
        if (refundRecord == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "La reserva no tiene refund record");
        }
        if (refundRecord.getStatus() != BookingRefundStatus.FAILED
            && refundRecord.getStatus() != BookingRefundStatus.PENDING_MANUAL) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El refund actual no admite retry manual");
        }

        BookingFinanceDispatchPlan plan = bookingProviderIntegrationService.retryRefund(booking, refundRecord);
        BookingFinanceUpdateResult result = plan.localResult();
        bookingEventService.record(
            booking,
            BookingEventType.BOOKING_REFUND_RETRY_REQUESTED,
            BookingActorType.SYSTEM,
            null,
            Map.of(
                "refundRecordId", refundRecord.getId(),
                "resultStatus", result.refundRecord() == null ? "UNKNOWN" : result.refundRecord().getStatus().name()
            )
        );

        return new InternalBookingOpsActionResponse(
            "RETRY_REFUND",
            result.refundRecord() == null ? "NOOP" : result.refundRecord().getStatus().name(),
            "Retry manual de refund ejecutado sobre la evidencia actual",
            buildDetail(booking)
        );
    }

    @Transactional
    public InternalBookingOpsActionResponse recomputeFinancialSummary(Long bookingId) {
        Booking booking = loadBooking(bookingId, true);
        BookingFinancialSummary summary = bookingFinanceService.ensureInitializedWithEvidence(booking);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("financialStatus", summary.getFinancialStatus().name());
        payload.put("amountHeld", bookingMoneyResolver.normalizeAmount(summary.getAmountHeld()));
        bookingEventService.record(
            booking,
            BookingEventType.BOOKING_FINANCIAL_RECOMPUTED,
            BookingActorType.SYSTEM,
            null,
            payload
        );
        return new InternalBookingOpsActionResponse(
            "RECOMPUTE_FINANCIAL_SUMMARY",
            "OK",
            "Financial summary recompuesto desde evidencia persistida",
            buildDetail(booking)
        );
    }

    @Transactional
    public InternalBookingOpsActionResponse reconcileBooking(Long bookingId) {
        Booking booking = loadBooking(bookingId, true);
        BookingFinancialSummary summary = bookingFinanceService.ensureInitializedWithEvidence(booking);
        BookingRefundRecord refundRecord = bookingFinanceService.findLatestRefundRecord(bookingId);
        BookingPayoutRecord payoutRecord = bookingFinanceService.findLatestPayoutRecord(bookingId);
        if (refundRecord != null) {
            summary = bookingFinanceService.applyRefundEvidence(booking, refundRecord);
        }
        if (payoutRecord != null) {
            summary = bookingFinanceService.applyPayoutEvidence(booking, payoutRecord);
        }
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("financialStatus", summary.getFinancialStatus().name());
        if (refundRecord != null) {
            payload.put("refundRecordId", refundRecord.getId());
        }
        if (payoutRecord != null) {
            payload.put("payoutRecordId", payoutRecord.getId());
        }
        bookingEventService.record(
            booking,
            BookingEventType.BOOKING_FINANCIAL_RECONCILED,
            BookingActorType.SYSTEM,
            null,
            payload
        );
        return new InternalBookingOpsActionResponse(
            "RECONCILE_BOOKING",
            "OK",
            "Conciliación mínima local ejecutada desde evidencia persistida y últimos records",
            buildDetail(booking)
        );
    }

    private Booking loadBooking(Long bookingId, boolean forUpdate) {
        return (forUpdate ? bookingRepository.findDetailedByIdForUpdate(bookingId) : bookingRepository.findDetailedById(bookingId))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva no encontrada"));
    }

    private InternalBookingOpsDetailResponse buildDetail(Booking booking) {
        Long bookingId = booking.getId();
        BookingFinancialSummary summary = bookingFinancialSummaryRepository.findByBooking_Id(bookingId).orElse(null);
        List<BookingActionDecisionResponse> decisions = bookingActionDecisionRepository.findByBooking_IdOrderByCreatedAtDesc(bookingId).stream()
            .map(bookingActionDecisionService::toResponse)
            .toList();
        List<BookingRefundRecordResponse> refundRecords = bookingRefundRecordRepository.findByBooking_IdOrderByCreatedAtDesc(bookingId).stream()
            .map(bookingFinanceService::toResponse)
            .toList();
        List<BookingPayoutRecordResponse> payoutRecords = bookingPayoutRecordRepository.findByBooking_IdOrderByCreatedAtDesc(bookingId).stream()
            .map(bookingFinanceService::toResponse)
            .toList();
        List<InternalPaymentTransactionResponse> paymentTransactions = paymentTransactionRepository.findByBooking_IdOrderByCreatedAtDesc(bookingId).stream()
            .map(this::toResponse)
            .toList();
        List<InternalPaymentEventResponse> paymentEvents = paymentEventRepository.findByBooking_IdOrderByCreatedAtDesc(bookingId).stream()
            .map(this::toResponse)
            .toList();
        List<InternalBookingEventResponse> bookingEvents = bookingEventRepository.findByBooking_IdOrderByCreatedAtDesc(bookingId).stream()
            .map(this::toResponse)
            .toList();
        List<InternalBookingConsistencyIssueResponse> consistencyIssues = inspectConsistency(booking, summary);

        return new InternalBookingOpsDetailResponse(
            mapBooking(booking),
            decisions,
            bookingFinanceService.toResponse(summary),
            refundRecords,
            payoutRecords,
            paymentTransactions,
            paymentEvents,
            bookingEvents,
            consistencyIssues
        );
    }

    private ProfessionalBookingResponse mapBooking(Booking booking) {
        int postBufferMinutes = booking.getServicePostBufferMinutesSnapshot() == null
            ? 0
            : Math.max(0, booking.getServicePostBufferMinutesSnapshot());
        String duration = booking.getServiceDurationSnapshot();
        String serviceName = booking.getServiceNameSnapshot();
        return new ProfessionalBookingResponse(
            booking.getId(),
            booking.getUser() == null ? null : String.valueOf(booking.getUser().getId()),
            booking.getUser() == null ? null : booking.getUser().getFullName(),
            booking.getServiceId(),
            serviceName,
            booking.getStartDateTime() == null ? null : booking.getStartDateTime().toString(),
            booking.getStartDateTimeUtc() == null ? null : booking.getStartDateTimeUtc().toString(),
            booking.getTimezone(),
            duration,
            postBufferMinutes,
            ProfessionalBookingResponse.resolveEffectiveDurationMinutes(duration, postBufferMinutes),
            booking.getServicePaymentTypeSnapshot() == null ? null : booking.getServicePaymentTypeSnapshot().name(),
            booking.getRescheduleCount(),
            booking.getOperationalStatus() == null ? null : booking.getOperationalStatus().name(),
            null,
            null,
            null,
            null
        );
    }

    private InternalPaymentTransactionResponse toResponse(PaymentTransaction transaction) {
        return new InternalPaymentTransactionResponse(
            transaction.getId(),
            transaction.getTransactionType() == null ? null : transaction.getTransactionType().name(),
            transaction.getStatus() == null ? null : transaction.getStatus().name(),
            transaction.getProvider() == null ? null : transaction.getProvider().name(),
            transaction.getProviderPaymentId(),
            transaction.getExternalReference(),
            transaction.getAmount(),
            transaction.getCurrency(),
            transaction.getProviderStatus(),
            transaction.getCreatedAt(),
            transaction.getApprovedAt(),
            transaction.getFailedAt()
        );
    }

    private InternalPaymentEventResponse toResponse(PaymentEvent event) {
        return new InternalPaymentEventResponse(
            event.getId(),
            event.getProvider() == null ? null : event.getProvider().name(),
            event.getEventType(),
            event.getProviderEventId(),
            event.getProviderObjectId(),
            event.getProcessed(),
            event.getProcessedAt(),
            event.getProcessingError(),
            event.getCreatedAt()
        );
    }

    private InternalBookingEventResponse toResponse(BookingEvent event) {
        return new InternalBookingEventResponse(
            event.getId(),
            event.getEventType() == null ? null : event.getEventType().name(),
            event.getActorType() == null ? null : event.getActorType().name(),
            event.getActorUserId(),
            event.getPayloadJson(),
            event.getCreatedAt()
        );
    }

    private List<InternalBookingConsistencyIssueResponse> inspectConsistency(Booking booking, BookingFinancialSummary summary) {
        List<InternalBookingConsistencyIssueResponse> issues = new ArrayList<>();
        if (summary == null) {
            issues.add(new InternalBookingConsistencyIssueResponse(
                "FINANCIAL_SUMMARY_MISSING",
                "La reserva no tiene booking_financial_summary persistido"
            ));
            return issues;
        }

        BookingFinancialEvidenceSnapshot evidence = bookingFinanceService.inspectEvidenceState(booking);
        compareAmount(issues, "AMOUNT_CHARGED_MISMATCH", summary.getAmountCharged(), evidence.amountCharged());
        compareAmount(issues, "AMOUNT_HELD_MISMATCH", summary.getAmountHeld(), evidence.amountHeld());
        compareAmount(issues, "AMOUNT_TO_REFUND_MISMATCH", summary.getAmountToRefund(), evidence.amountToRefund());
        compareAmount(issues, "AMOUNT_REFUNDED_MISMATCH", summary.getAmountRefunded(), evidence.amountRefunded());
        compareAmount(issues, "AMOUNT_TO_RELEASE_MISMATCH", summary.getAmountToRelease(), evidence.amountToRelease());
        compareAmount(issues, "AMOUNT_RELEASED_MISMATCH", summary.getAmountReleased(), evidence.amountReleased());
        if (summary.getFinancialStatus() != evidence.financialStatus()) {
            issues.add(new InternalBookingConsistencyIssueResponse(
                "FINANCIAL_STATUS_MISMATCH",
                "Summary=" + summary.getFinancialStatus() + " evidence=" + evidence.financialStatus()
            ));
        }

        List<BookingRefundRecord> refundRecords = bookingRefundRecordRepository.findByBooking_IdOrderByCreatedAtDesc(booking.getId());
        List<BookingPayoutRecord> payoutRecords = bookingPayoutRecordRepository.findByBooking_IdOrderByCreatedAtDesc(booking.getId());
        List<PaymentTransaction> transactions = paymentTransactionRepository.findByBooking_IdOrderByCreatedAtDesc(booking.getId());
        List<PaymentEvent> paymentEvents = paymentEventRepository.findByBooking_IdOrderByCreatedAtDesc(booking.getId());

        boolean hasPendingRefundWithoutTx = refundRecords.stream()
            .filter(refund -> refund.getStatus() == BookingRefundStatus.PENDING_MANUAL
                || refund.getStatus() == BookingRefundStatus.PENDING_PROVIDER)
            .anyMatch(refund -> transactions.stream()
                .noneMatch(tx -> tx.getRefundRecord() != null && refund.getId().equals(tx.getRefundRecord().getId())));
        if (hasPendingRefundWithoutTx) {
            issues.add(new InternalBookingConsistencyIssueResponse(
                "REFUND_PENDING_WITHOUT_TRANSACTION",
                "Hay refund pending sin payment_transaction asociado"
            ));
        }

        boolean hasPendingPayoutWithoutTx = payoutRecords.stream()
            .filter(payout -> payout.getStatus() == BookingPayoutStatus.PENDING_MANUAL
                || payout.getStatus() == BookingPayoutStatus.PENDING_PROVIDER)
            .anyMatch(payout -> transactions.stream()
                .noneMatch(tx -> tx.getPayoutRecord() != null && payout.getId().equals(tx.getPayoutRecord().getId())));
        if (hasPendingPayoutWithoutTx) {
            issues.add(new InternalBookingConsistencyIssueResponse(
                "RELEASE_PENDING_WITHOUT_TRANSACTION",
                "Hay payout pending sin payment_transaction asociado"
            ));
        }

        boolean hasWebhookError = paymentEvents.stream()
            .anyMatch(event -> Boolean.FALSE.equals(event.getProcessed())
                || (event.getProcessingError() != null && !event.getProcessingError().isBlank()));
        if (hasWebhookError) {
            issues.add(new InternalBookingConsistencyIssueResponse(
                "PAYMENT_EVENT_PROCESSING_ERROR",
                "Existen webhooks no procesados o con error persistido"
            ));
        }

        if ((booking.getOperationalStatus() == BookingOperationalStatus.CANCELLED
            || booking.getOperationalStatus() == BookingOperationalStatus.COMPLETED
            || booking.getOperationalStatus() == BookingOperationalStatus.NO_SHOW)
            && evidence.amountHeld().signum() > 0
            && evidence.amountToRefund().signum() == 0
            && evidence.amountToRelease().signum() == 0) {
            issues.add(new InternalBookingConsistencyIssueResponse(
                "TERMINAL_BOOKING_WITH_HELD_FUNDS",
                "La reserva está terminal pero todavía retiene fondos sin refund ni payout abiertos"
            ));
        }

        return issues;
    }

    private void compareAmount(
        List<InternalBookingConsistencyIssueResponse> issues,
        String code,
        BigDecimal stored,
        BigDecimal evidence
    ) {
        BigDecimal normalizedStored = bookingMoneyResolver.normalizeAmount(stored);
        BigDecimal normalizedEvidence = bookingMoneyResolver.normalizeAmount(evidence);
        if (normalizedStored.compareTo(normalizedEvidence) != 0) {
            issues.add(new InternalBookingConsistencyIssueResponse(
                code,
                "Summary=" + normalizedStored + " evidence=" + normalizedEvidence
            ));
        }
    }

    private InternalBookingIssueResponse inconsistencyIssue(Booking booking) {
        BookingFinancialSummary summary = bookingFinancialSummaryRepository.findByBooking_Id(booking.getId()).orElse(null);
        List<InternalBookingConsistencyIssueResponse> issues = inspectConsistency(booking, summary);
        if (issues.isEmpty()) {
            return null;
        }
        String detail = issues.stream().map(issue -> issue.code() + ": " + issue.detail()).reduce((a, b) -> a + " | " + b).orElse("Inconsistencia");
        return issueForBooking(
            booking,
            summary,
            "FINANCIAL_INCONSISTENCY",
            detail
        );
    }

    private InternalBookingIssueResponse failedRefundIssue(BookingRefundRecord refundRecord) {
        Booking booking = refundRecord.getBooking();
        if (booking == null) {
            return null;
        }
        BookingFinancialSummary summary = bookingFinancialSummaryRepository.findByBooking_Id(booking.getId()).orElse(null);
        long failedAttempts = paymentTransactionRepository.findByBooking_IdOrderByCreatedAtDesc(booking.getId()).stream()
            .filter(tx -> tx.getTransactionType() == PaymentTransactionType.BOOKING_REFUND
                && tx.getRefundRecord() != null
                && refundRecord.getId().equals(tx.getRefundRecord().getId())
                && tx.getStatus() == PaymentTransactionStatus.FAILED)
            .count();
        return issueForBooking(
            booking,
            summary,
            "REFUND_FAILED",
            "Refund record " + refundRecord.getId() + " failedAttempts=" + failedAttempts
        );
    }

    private InternalBookingIssueResponse failedPayoutIssue(BookingPayoutRecord payoutRecord) {
        Booking booking = payoutRecord.getBooking();
        if (booking == null) {
            return null;
        }
        BookingFinancialSummary summary = bookingFinancialSummaryRepository.findByBooking_Id(booking.getId()).orElse(null);
        long failedAttempts = paymentTransactionRepository.findByBooking_IdOrderByCreatedAtDesc(booking.getId()).stream()
            .filter(tx -> tx.getTransactionType() == PaymentTransactionType.BOOKING_PAYOUT
                && tx.getPayoutRecord() != null
                && payoutRecord.getId().equals(tx.getPayoutRecord().getId())
                && tx.getStatus() == PaymentTransactionStatus.FAILED)
            .count();
        return issueForBooking(
            booking,
            summary,
            "PAYOUT_FAILED",
            "Payout record " + payoutRecord.getId() + " failedAttempts=" + failedAttempts
        );
    }

    private InternalBookingIssueResponse issueFromSummary(
        BookingFinancialSummary summary,
        String code,
        String detail
    ) {
        return issueForBooking(summary.getBooking(), summary, code, detail);
    }

    private InternalBookingIssueResponse issueForBooking(
        Booking booking,
        BookingFinancialSummary summary,
        String code,
        String detail
    ) {
        if (booking == null) {
            return null;
        }
        return new InternalBookingIssueResponse(
            booking.getId(),
            booking.getOperationalStatus() == null ? null : booking.getOperationalStatus().name(),
            summary == null || summary.getFinancialStatus() == null ? null : summary.getFinancialStatus().name(),
            code,
            detail,
            booking.getStartDateTime(),
            summary == null ? null : summary.getUpdatedAt(),
            summary == null ? BigDecimal.ZERO : summary.getAmountHeld(),
            summary == null ? BigDecimal.ZERO : summary.getAmountToRefund(),
            summary == null ? BigDecimal.ZERO : summary.getAmountToRelease(),
            summary == null ? null : summary.getLastDecisionId()
        );
    }

    private List<InternalBookingIssueResponse> distinctIssuesByBooking(List<InternalBookingIssueResponse> issues) {
        Set<Long> seen = new LinkedHashSet<>();
        List<InternalBookingIssueResponse> distinct = new ArrayList<>();
        for (InternalBookingIssueResponse issue : issues) {
            if (issue == null || issue.bookingId() == null || !seen.add(issue.bookingId())) {
                continue;
            }
            distinct.add(issue);
        }
        return distinct;
    }
}
