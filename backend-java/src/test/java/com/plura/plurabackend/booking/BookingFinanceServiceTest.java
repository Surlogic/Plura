package com.plura.plurabackend.booking;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.billing.payments.repository.PaymentTransactionRepository;
import com.plura.plurabackend.billing.payments.model.PaymentTransaction;
import com.plura.plurabackend.billing.payments.model.PaymentTransactionStatus;
import com.plura.plurabackend.billing.payments.model.PaymentTransactionType;
import com.plura.plurabackend.booking.decision.model.BookingActionDecision;
import com.plura.plurabackend.booking.decision.model.BookingActionType;
import com.plura.plurabackend.booking.decision.repository.BookingActionDecisionRepository;
import com.plura.plurabackend.booking.event.model.BookingActorType;
import com.plura.plurabackend.booking.finance.BookingFinanceService;
import com.plura.plurabackend.booking.finance.BookingFinanceUpdateResult;
import com.plura.plurabackend.booking.finance.BookingMoneyResolver;
import com.plura.plurabackend.booking.finance.model.BookingFinancialStatus;
import com.plura.plurabackend.booking.finance.model.BookingFinancialSummary;
import com.plura.plurabackend.booking.finance.model.BookingPayoutReasonCode;
import com.plura.plurabackend.booking.finance.model.BookingPayoutStatus;
import com.plura.plurabackend.booking.finance.model.BookingRefundReasonCode;
import com.plura.plurabackend.booking.finance.model.BookingRefundStatus;
import com.plura.plurabackend.booking.finance.repository.BookingFinancialSummaryRepository;
import com.plura.plurabackend.booking.finance.repository.BookingPayoutRecordRepository;
import com.plura.plurabackend.booking.finance.repository.BookingRefundRecordRepository;
import com.plura.plurabackend.booking.model.Booking;
import com.plura.plurabackend.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.booking.model.ServicePaymentType;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;

class BookingFinanceServiceTest {

    private final BookingFinancialSummaryRepository summaryRepository = mock(BookingFinancialSummaryRepository.class);
    private final BookingRefundRecordRepository refundRecordRepository = mock(BookingRefundRecordRepository.class);
    private final BookingPayoutRecordRepository payoutRecordRepository = mock(BookingPayoutRecordRepository.class);
    private final PaymentTransactionRepository paymentTransactionRepository = mock(PaymentTransactionRepository.class);
    private final BookingActionDecisionRepository bookingActionDecisionRepository = mock(BookingActionDecisionRepository.class);
    private final BookingFinanceService bookingFinanceService = new BookingFinanceService(
        summaryRepository,
        refundRecordRepository,
        payoutRecordRepository,
        paymentTransactionRepository,
        bookingActionDecisionRepository,
        new BookingMoneyResolver(),
        new ObjectMapper()
    );

    @Test
    void shouldInitializePrepaidBookingAsPaymentPendingUntilProviderConfirmsCharge() {
        Booking booking = booking(ServicePaymentType.DEPOSIT, BigDecimal.valueOf(1000), BigDecimal.valueOf(300));
        when(summaryRepository.findByBooking_Id(booking.getId())).thenReturn(Optional.empty());
        when(summaryRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        BookingFinancialSummary summary = bookingFinanceService.ensureInitialized(booking);

        assertEquals(BigDecimal.ZERO, summary.getAmountCharged());
        assertEquals(BookingFinancialStatus.PAYMENT_PENDING, summary.getFinancialStatus());
        assertEquals(BigDecimal.ZERO, summary.getAmountToRefund());
    }

    @Test
    void shouldCreateRefundRecordWhenCancellationNeedsRefund() {
        Booking booking = booking(ServicePaymentType.FULL_PREPAY, BigDecimal.valueOf(1500), null);
        BookingFinancialSummary existingSummary = new BookingFinancialSummary();
        existingSummary.setBooking(booking);
        existingSummary.setAmountCharged(BigDecimal.valueOf(1500));
        existingSummary.setAmountHeld(BigDecimal.valueOf(1500));
        existingSummary.setAmountToRefund(BigDecimal.ZERO);
        existingSummary.setAmountRefunded(BigDecimal.ZERO);
        existingSummary.setAmountToRelease(BigDecimal.ZERO);
        existingSummary.setAmountReleased(BigDecimal.ZERO);
        existingSummary.setCurrency("UYU");
        existingSummary.setFinancialStatus(BookingFinancialStatus.HELD);

        BookingActionDecision decision = new BookingActionDecision();
        decision.setId("decision-1");
        decision.setBooking(booking);
        decision.setActionType(BookingActionType.CANCEL);
        decision.setActorType(BookingActorType.PROFESSIONAL);
        decision.setActorUserId(99L);
        decision.setRefundPreviewAmount(BigDecimal.valueOf(1500));
        decision.setRetainPreviewAmount(BigDecimal.ZERO);
        decision.setCurrency("UYU");
        decision.setFinancialOutcomeCode("PENDING_REFUND_REVIEW");

        when(summaryRepository.findByBooking_Id(booking.getId())).thenReturn(Optional.of(existingSummary));
        when(summaryRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        AtomicReference<Object> savedRefundRecord = new AtomicReference<>();
        when(refundRecordRepository.findByRelatedDecisionId(decision.getId())).thenReturn(Optional.empty());
        when(refundRecordRepository.save(any())).thenAnswer(invocation -> {
            Object saved = invocation.getArgument(0);
            savedRefundRecord.set(saved);
            return saved;
        });
        when(payoutRecordRepository.findByRelatedDecisionId(decision.getId())).thenReturn(Optional.empty());
        PaymentTransaction approvedCharge = approvedCharge(booking, BigDecimal.valueOf(1500));
        when(paymentTransactionRepository.findByBooking_IdAndTransactionTypeOrderByCreatedAtAsc(booking.getId(), PaymentTransactionType.BOOKING_CHARGE))
            .thenReturn(List.of(approvedCharge));
        when(paymentTransactionRepository.findByBooking_IdAndTransactionTypeOrderByCreatedAtAsc(booking.getId(), PaymentTransactionType.BOOKING_REFUND))
            .thenReturn(List.of());
        when(paymentTransactionRepository.findByBooking_IdAndTransactionTypeOrderByCreatedAtAsc(booking.getId(), PaymentTransactionType.BOOKING_PAYOUT))
            .thenReturn(List.of());
        when(refundRecordRepository.findByBooking_IdOrderByCreatedAtDesc(booking.getId())).thenAnswer(invocation ->
            savedRefundRecord.get() == null ? List.of() : List.of((com.plura.plurabackend.booking.finance.model.BookingRefundRecord) savedRefundRecord.get())
        );
        when(payoutRecordRepository.findByBooking_IdOrderByCreatedAtDesc(booking.getId())).thenReturn(List.of());

        BookingFinanceUpdateResult result = bookingFinanceService.applyDecision(booking, decision);

        assertEquals(BookingFinancialStatus.REFUND_PENDING, result.summary().getFinancialStatus());
        assertEquals(BigDecimal.valueOf(1500), result.summary().getAmountToRefund());
        assertNotNull(result.refundRecord());
        assertEquals(BookingRefundStatus.PENDING_MANUAL, result.refundRecord().getStatus());
        assertEquals(BookingRefundReasonCode.PROFESSIONAL_CANCELLATION, result.refundRecord().getReasonCode());
    }

    @Test
    void shouldCreatePayoutRecordWhenCompletedBookingHasHeldFunds() {
        Booking booking = booking(ServicePaymentType.FULL_PREPAY, BigDecimal.valueOf(1500), null);
        booking.setOperationalStatus(BookingOperationalStatus.COMPLETED);
        BookingFinancialSummary existingSummary = new BookingFinancialSummary();
        existingSummary.setBooking(booking);
        existingSummary.setAmountCharged(BigDecimal.valueOf(1500));
        existingSummary.setAmountHeld(BigDecimal.valueOf(1500));
        existingSummary.setAmountToRefund(BigDecimal.ZERO);
        existingSummary.setAmountRefunded(BigDecimal.ZERO);
        existingSummary.setAmountToRelease(BigDecimal.ZERO);
        existingSummary.setAmountReleased(BigDecimal.ZERO);
        existingSummary.setCurrency("UYU");
        existingSummary.setFinancialStatus(BookingFinancialStatus.HELD);

        BookingActionDecision decision = new BookingActionDecision();
        decision.setId("decision-complete");
        decision.setBooking(booking);
        decision.setActionType(BookingActionType.COMPLETE);
        decision.setActorType(BookingActorType.PROFESSIONAL);
        decision.setActorUserId(99L);
        decision.setRefundPreviewAmount(BigDecimal.ZERO);
        decision.setRetainPreviewAmount(BigDecimal.ZERO);
        decision.setCurrency("UYU");

        when(summaryRepository.findByBooking_Id(booking.getId())).thenReturn(Optional.of(existingSummary));
        when(summaryRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(refundRecordRepository.findByRelatedDecisionId(decision.getId())).thenReturn(Optional.empty());
        when(payoutRecordRepository.findByRelatedDecisionId(decision.getId())).thenReturn(Optional.empty());
        AtomicReference<Object> savedPayoutRecord = new AtomicReference<>();
        when(payoutRecordRepository.save(any())).thenAnswer(invocation -> {
            Object saved = invocation.getArgument(0);
            savedPayoutRecord.set(saved);
            return saved;
        });
        PaymentTransaction approvedCharge = approvedCharge(booking, BigDecimal.valueOf(1500));
        when(paymentTransactionRepository.findByBooking_IdAndTransactionTypeOrderByCreatedAtAsc(booking.getId(), PaymentTransactionType.BOOKING_CHARGE))
            .thenReturn(List.of(approvedCharge));
        when(paymentTransactionRepository.findByBooking_IdAndTransactionTypeOrderByCreatedAtAsc(booking.getId(), PaymentTransactionType.BOOKING_REFUND))
            .thenReturn(List.of());
        when(paymentTransactionRepository.findByBooking_IdAndTransactionTypeOrderByCreatedAtAsc(booking.getId(), PaymentTransactionType.BOOKING_PAYOUT))
            .thenReturn(List.of());
        when(refundRecordRepository.findByBooking_IdOrderByCreatedAtDesc(booking.getId())).thenReturn(List.of());
        when(payoutRecordRepository.findByBooking_IdOrderByCreatedAtDesc(booking.getId())).thenAnswer(invocation ->
            savedPayoutRecord.get() == null ? List.of() : List.of((com.plura.plurabackend.booking.finance.model.BookingPayoutRecord) savedPayoutRecord.get())
        );

        BookingFinanceUpdateResult result = bookingFinanceService.applyDecision(booking, decision);

        assertEquals(BookingFinancialStatus.RELEASE_PENDING, result.summary().getFinancialStatus());
        assertEquals(BigDecimal.valueOf(1500), result.summary().getAmountToRelease());
        assertNotNull(result.payoutRecord());
        assertEquals(BookingPayoutStatus.PENDING_MANUAL, result.payoutRecord().getStatus());
        assertEquals(BookingPayoutReasonCode.BOOKING_COMPLETED, result.payoutRecord().getReasonCode());
    }

    private Booking booking(ServicePaymentType paymentType, BigDecimal price, BigDecimal depositAmount) {
        Booking booking = new Booking();
        booking.setId(10L);
        booking.setOperationalStatus(BookingOperationalStatus.CONFIRMED);
        booking.setServicePaymentTypeSnapshot(paymentType);
        booking.setServicePriceSnapshot(price);
        booking.setServiceDepositAmountSnapshot(depositAmount);
        return booking;
    }

    private PaymentTransaction approvedCharge(Booking booking, BigDecimal amount) {
        PaymentTransaction transaction = new PaymentTransaction();
        transaction.setBooking(booking);
        transaction.setTransactionType(PaymentTransactionType.BOOKING_CHARGE);
        transaction.setStatus(PaymentTransactionStatus.APPROVED);
        transaction.setAmount(amount);
        transaction.setCurrency("UYU");
        return transaction;
    }
}
