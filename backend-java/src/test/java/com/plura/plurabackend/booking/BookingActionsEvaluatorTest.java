package com.plura.plurabackend.booking;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.plura.plurabackend.booking.actions.BookingActionsEvaluation;
import com.plura.plurabackend.booking.actions.BookingActionsEvaluator;
import com.plura.plurabackend.booking.actions.model.BookingActionActor;
import com.plura.plurabackend.booking.actions.model.BookingActionReasonCode;
import com.plura.plurabackend.booking.actions.model.BookingSuggestedAction;
import com.plura.plurabackend.booking.finance.BookingMoneyResolver;
import com.plura.plurabackend.booking.model.Booking;
import com.plura.plurabackend.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.booking.model.ServicePaymentType;
import com.plura.plurabackend.booking.policy.BookingPolicySnapshot;
import com.plura.plurabackend.booking.policy.model.LateCancellationRefundMode;
import com.plura.plurabackend.booking.time.BookingDateTimeService;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class BookingActionsEvaluatorTest {

    private final BookingActionsEvaluator evaluator = new BookingActionsEvaluator(
        new BookingMoneyResolver(),
        new BookingDateTimeService("America/Montevideo")
    );

    @Test
    void shouldAllowFreeClientCancellationWithinWindow() {
        Booking booking = booking(ServicePaymentType.FULL_PREPAY, BigDecimal.valueOf(1200), null);
        BookingPolicySnapshot policy = policy(
            true,
            24,
            12,
            1,
            LateCancellationRefundMode.NONE,
            BigDecimal.ZERO
        );

        BookingActionsEvaluation evaluation = evaluator.evaluate(
            booking,
            new BookingActionActor(BookingActionActor.BookingActionActorType.CLIENT, 10L, null),
            policy,
            LocalDateTime.of(2026, 3, 8, 12, 0)
        );

        assertTrue(evaluation.canCancel());
        assertEquals(BigDecimal.valueOf(1200), evaluation.refundPreviewAmount());
        assertEquals(BigDecimal.ZERO, evaluation.retainPreviewAmount());
        assertTrue(evaluation.reasonCodes().contains(BookingActionReasonCode.FREE_CANCELLATION_WINDOW_OPEN));
        assertEquals(BookingSuggestedAction.NONE, evaluation.suggestedAction());
    }

    @Test
    void shouldSuggestRescheduleWhenLateCancellationWouldLoseDeposit() {
        Booking booking = booking(ServicePaymentType.DEPOSIT, BigDecimal.valueOf(2500), BigDecimal.valueOf(500));
        booking.setStartDateTime(LocalDateTime.of(2026, 3, 9, 8, 0));
        BookingPolicySnapshot policy = policy(
            true,
            24,
            2,
            2,
            LateCancellationRefundMode.NONE,
            BigDecimal.ZERO
        );

        BookingActionsEvaluation evaluation = evaluator.evaluate(
            booking,
            new BookingActionActor(BookingActionActor.BookingActionActorType.CLIENT, 10L, null),
            policy,
            LocalDateTime.of(2026, 3, 8, 12, 0)
        );

        assertTrue(evaluation.canCancel());
        assertTrue(evaluation.canReschedule());
        assertEquals(BigDecimal.ZERO, evaluation.refundPreviewAmount());
        assertEquals(BigDecimal.valueOf(500), evaluation.retainPreviewAmount());
        assertEquals(BookingSuggestedAction.RESCHEDULE, evaluation.suggestedAction());
        assertTrue(evaluation.reasonCodes().contains(BookingActionReasonCode.LATE_CANCELLATION_PENALTY_APPLIES));
    }

    @Test
    void shouldApplyPartialRefundInsideCancellationWindow() {
        Booking booking = booking(ServicePaymentType.FULL_PREPAY, BigDecimal.valueOf(1000), null);
        booking.setStartDateTime(LocalDateTime.of(2026, 3, 9, 8, 0));
        BookingPolicySnapshot policy = policy(
            true,
            24,
            2,
            2,
            LateCancellationRefundMode.PERCENTAGE,
            BigDecimal.valueOf(50)
        );

        BookingActionsEvaluation evaluation = evaluator.evaluate(
            booking,
            new BookingActionActor(BookingActionActor.BookingActionActorType.CLIENT, 10L, null),
            policy,
            LocalDateTime.of(2026, 3, 8, 12, 0)
        );

        assertTrue(evaluation.canCancel());
        assertEquals(BigDecimal.valueOf(500.00).setScale(2), evaluation.refundPreviewAmount());
        assertEquals(BigDecimal.valueOf(500.00).setScale(2), evaluation.retainPreviewAmount());
        assertTrue(evaluation.reasonCodes().contains(BookingActionReasonCode.LATE_CANCELLATION_PENALTY_APPLIES));
    }

    @Test
    void shouldBlockClientRescheduleWhenDisabledByPolicy() {
        Booking booking = booking(ServicePaymentType.ON_SITE, BigDecimal.ZERO, null);
        BookingPolicySnapshot policy = policy(
            false,
            24,
            2,
            1,
            LateCancellationRefundMode.FULL,
            BigDecimal.valueOf(100)
        );

        BookingActionsEvaluation evaluation = evaluator.evaluate(
            booking,
            new BookingActionActor(BookingActionActor.BookingActionActorType.CLIENT, 10L, null),
            policy,
            LocalDateTime.of(2026, 3, 8, 12, 0)
        );

        assertFalse(evaluation.canReschedule());
        assertTrue(evaluation.reasonCodes().contains(BookingActionReasonCode.CLIENT_RESCHEDULE_DISABLED));
    }

    @Test
    void shouldBlockClientRescheduleWhenMaxClientReschedulesIsZero() {
        Booking booking = booking(ServicePaymentType.ON_SITE, BigDecimal.ZERO, null);
        BookingPolicySnapshot policy = policy(
            true,
            24,
            2,
            0,
            LateCancellationRefundMode.FULL,
            BigDecimal.valueOf(100)
        );

        BookingActionsEvaluation evaluation = evaluator.evaluate(
            booking,
            new BookingActionActor(BookingActionActor.BookingActionActorType.CLIENT, 10L, null),
            policy,
            LocalDateTime.of(2026, 3, 8, 12, 0)
        );

        assertFalse(evaluation.canReschedule());
        assertTrue(evaluation.reasonCodes().contains(BookingActionReasonCode.RESCHEDULE_LIMIT_REACHED));
    }

    @Test
    void shouldAllowClientRescheduleWhenMaxIsOneAndCountIsZero() {
        Booking booking = booking(ServicePaymentType.ON_SITE, BigDecimal.ZERO, null);
        booking.setRescheduleCount(0);
        BookingPolicySnapshot policy = policy(
            true,
            24,
            2,
            1,
            LateCancellationRefundMode.FULL,
            BigDecimal.valueOf(100)
        );

        BookingActionsEvaluation evaluation = evaluator.evaluate(
            booking,
            new BookingActionActor(BookingActionActor.BookingActionActorType.CLIENT, 10L, null),
            policy,
            LocalDateTime.of(2026, 3, 8, 12, 0)
        );

        assertTrue(evaluation.canReschedule());
        assertTrue(evaluation.reasonCodes().contains(BookingActionReasonCode.RESCHEDULE_WINDOW_OPEN));
    }

    @Test
    void shouldBlockClientRescheduleWhenMaxIsOneAndCountIsOne() {
        Booking booking = booking(ServicePaymentType.ON_SITE, BigDecimal.ZERO, null);
        booking.setRescheduleCount(1);
        BookingPolicySnapshot policy = policy(
            true,
            24,
            2,
            1,
            LateCancellationRefundMode.FULL,
            BigDecimal.valueOf(100)
        );

        BookingActionsEvaluation evaluation = evaluator.evaluate(
            booking,
            new BookingActionActor(BookingActionActor.BookingActionActorType.CLIENT, 10L, null),
            policy,
            LocalDateTime.of(2026, 3, 8, 12, 0)
        );

        assertFalse(evaluation.canReschedule());
        assertTrue(evaluation.reasonCodes().contains(BookingActionReasonCode.RESCHEDULE_LIMIT_REACHED));
    }

    @Test
    void shouldBlockClientRescheduleWhenWindowIsClosed() {
        Booking booking = booking(ServicePaymentType.ON_SITE, BigDecimal.ZERO, null);
        booking.setStartDateTime(LocalDateTime.of(2026, 3, 8, 18, 0));
        BookingPolicySnapshot policy = policy(
            true,
            24,
            8,
            1,
            LateCancellationRefundMode.FULL,
            BigDecimal.valueOf(100)
        );

        BookingActionsEvaluation evaluation = evaluator.evaluate(
            booking,
            new BookingActionActor(BookingActionActor.BookingActionActorType.CLIENT, 10L, null),
            policy,
            LocalDateTime.of(2026, 3, 8, 12, 0)
        );

        assertFalse(evaluation.canReschedule());
        assertTrue(evaluation.reasonCodes().contains(BookingActionReasonCode.RESCHEDULE_WINDOW_CLOSED));
    }

    @Test
    void shouldBlockClientRescheduleWhenBookingIsNotActive() {
        Booking booking = booking(ServicePaymentType.ON_SITE, BigDecimal.ZERO, null);
        booking.setOperationalStatus(BookingOperationalStatus.CANCELLED);
        BookingPolicySnapshot policy = policy(
            true,
            24,
            2,
            1,
            LateCancellationRefundMode.FULL,
            BigDecimal.valueOf(100)
        );

        BookingActionsEvaluation evaluation = evaluator.evaluate(
            booking,
            new BookingActionActor(BookingActionActor.BookingActionActorType.CLIENT, 10L, null),
            policy,
            LocalDateTime.of(2026, 3, 8, 12, 0)
        );

        assertFalse(evaluation.canReschedule());
        assertTrue(evaluation.reasonCodes().contains(BookingActionReasonCode.BOOKING_NOT_ACTIVE));
    }

    @Test
    void shouldAllowProfessionalNoShowOnlyAfterStart() {
        Booking booking = booking(ServicePaymentType.DEPOSIT, BigDecimal.valueOf(2500), BigDecimal.valueOf(500));
        booking.setOperationalStatus(BookingOperationalStatus.CONFIRMED);
        booking.setStartDateTime(LocalDateTime.of(2026, 3, 8, 10, 0));
        BookingPolicySnapshot policy = policy(true, 24, 2, 1, LateCancellationRefundMode.FULL, BigDecimal.valueOf(100));

        BookingActionsEvaluation evaluation = evaluator.evaluate(
            booking,
            new BookingActionActor(BookingActionActor.BookingActionActorType.PROFESSIONAL, 20L, 30L),
            policy,
            LocalDateTime.of(2026, 3, 8, 12, 0)
        );

        assertFalse(evaluation.canCancel());
        assertFalse(evaluation.canReschedule());
        assertTrue(evaluation.canMarkNoShow());
        assertEquals(BigDecimal.ZERO, evaluation.refundPreviewAmount());
        assertEquals(BigDecimal.valueOf(500), evaluation.retainPreviewAmount());
        assertTrue(evaluation.reasonCodes().contains(BookingActionReasonCode.PROFESSIONAL_CAN_MARK_NO_SHOW));
    }

    private Booking booking(ServicePaymentType paymentType, BigDecimal price, BigDecimal depositAmount) {
        Booking booking = new Booking();
        booking.setId(1L);
        booking.setOperationalStatus(BookingOperationalStatus.CONFIRMED);
        booking.setTimezone("America/Montevideo");
        booking.setStartDateTime(LocalDateTime.of(2026, 3, 10, 12, 0));
        booking.setRescheduleCount(0);
        booking.setServicePaymentTypeSnapshot(paymentType);
        booking.setServicePriceSnapshot(price);
        booking.setServiceDepositAmountSnapshot(depositAmount);
        return booking;
    }

    private BookingPolicySnapshot policy(
        boolean allowClientReschedule,
        Integer cancellationWindowHours,
        Integer rescheduleWindowHours,
        Integer maxClientReschedules,
        LateCancellationRefundMode lateCancellationRefundMode,
        BigDecimal lateCancellationRefundValue
    ) {
        return new BookingPolicySnapshot(
            "policy-1",
            1L,
            30L,
            LocalDateTime.of(2026, 3, 1, 0, 0),
            true,
            allowClientReschedule,
            cancellationWindowHours,
            rescheduleWindowHours,
            maxClientReschedules,
            lateCancellationRefundMode,
            lateCancellationRefundValue
        );
    }
}
