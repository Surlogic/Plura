package com.plura.plurabackend.booking;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.plura.plurabackend.booking.actions.BookingActionsEvaluation;
import com.plura.plurabackend.booking.actions.BookingActionsEvaluator;
import com.plura.plurabackend.booking.finance.BookingMoneyResolver;
import com.plura.plurabackend.booking.actions.model.BookingActionActor;
import com.plura.plurabackend.booking.actions.model.BookingActionReasonCode;
import com.plura.plurabackend.booking.actions.model.BookingSuggestedAction;
import com.plura.plurabackend.booking.model.Booking;
import com.plura.plurabackend.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.booking.model.ServicePaymentType;
import com.plura.plurabackend.booking.policy.BookingPolicySnapshot;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class BookingActionsEvaluatorTest {

    private final BookingActionsEvaluator evaluator = new BookingActionsEvaluator(new BookingMoneyResolver());

    @Test
    void shouldAllowFreeClientCancellationWithinWindow() {
        Booking booking = booking(ServicePaymentType.FULL_PREPAY, BigDecimal.valueOf(1200), null);
        BookingPolicySnapshot policy = policy(24, 12, 1, true);

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
        BookingPolicySnapshot policy = policy(24, 2, 2, true);

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
    void shouldAllowProfessionalNoShowOnlyAfterStart() {
        Booking booking = booking(ServicePaymentType.ON_SITE, BigDecimal.ZERO, null);
        booking.setOperationalStatus(BookingOperationalStatus.CONFIRMED);
        booking.setStartDateTime(LocalDateTime.of(2026, 3, 8, 10, 0));
        BookingPolicySnapshot policy = policy(24, 2, 1, false);

        BookingActionsEvaluation evaluation = evaluator.evaluate(
            booking,
            new BookingActionActor(BookingActionActor.BookingActionActorType.PROFESSIONAL, 20L, 30L),
            policy,
            LocalDateTime.of(2026, 3, 8, 12, 0)
        );

        assertFalse(evaluation.canCancel());
        assertFalse(evaluation.canReschedule());
        assertTrue(evaluation.canMarkNoShow());
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
        Integer cancellationWindowHours,
        Integer rescheduleWindowHours,
        Integer maxClientReschedules,
        boolean retainDepositOnLateCancellation
    ) {
        return new BookingPolicySnapshot(
            "policy-1",
            1L,
            30L,
            LocalDateTime.of(2026, 3, 1, 0, 0),
            true,
            true,
            cancellationWindowHours,
            rescheduleWindowHours,
            maxClientReschedules,
            retainDepositOnLateCancellation
        );
    }
}
