package com.plura.plurabackend.booking.actions;

import com.plura.plurabackend.booking.actions.model.BookingActionActor;
import com.plura.plurabackend.booking.actions.model.BookingActionReasonCode;
import com.plura.plurabackend.booking.actions.model.BookingSuggestedAction;
import com.plura.plurabackend.booking.finance.BookingMoneyResolver;
import com.plura.plurabackend.booking.model.Booking;
import com.plura.plurabackend.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.booking.policy.BookingPolicySnapshot;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class BookingActionsEvaluator {

    private final BookingMoneyResolver bookingMoneyResolver;

    public BookingActionsEvaluator(BookingMoneyResolver bookingMoneyResolver) {
        this.bookingMoneyResolver = bookingMoneyResolver;
    }

    public BookingActionsEvaluation evaluate(
        Booking booking,
        BookingActionActor actor,
        BookingPolicySnapshot policy,
        LocalDateTime now
    ) {
        List<BookingActionReasonCode> reasons = new ArrayList<>();
        Map<String, String> params = new LinkedHashMap<>();

        boolean activeBooking = booking.getOperationalStatus() == BookingOperationalStatus.PENDING
            || booking.getOperationalStatus() == BookingOperationalStatus.CONFIRMED;
        boolean bookingStarted = !booking.getStartDateTime().isAfter(now);

        BigDecimal prepaidAmount = bookingMoneyResolver.resolvePrepaidAmount(booking);
        BigDecimal refundPreview = BigDecimal.ZERO;
        BigDecimal retainPreview = BigDecimal.ZERO;

        boolean canCancel = false;
        boolean canReschedule = false;
        boolean canMarkNoShow = false;
        BookingSuggestedAction suggestedAction = BookingSuggestedAction.NONE;

        long hoursUntilStart = Duration.between(now, booking.getStartDateTime()).toHours();
        params.put("hoursUntilStart", String.valueOf(hoursUntilStart));
        if (policy.cancellationWindowHours() != null) {
            params.put("cancellationWindowHours", String.valueOf(policy.cancellationWindowHours()));
        }
        if (policy.rescheduleWindowHours() != null) {
            params.put("rescheduleWindowHours", String.valueOf(policy.rescheduleWindowHours()));
        }
        params.put("rescheduleCount", String.valueOf(Math.max(0, booking.getRescheduleCount())));
        params.put("maxClientReschedules", String.valueOf(policy.maxClientReschedules()));

        if (!activeBooking) {
            reasons.add(BookingActionReasonCode.BOOKING_NOT_ACTIVE);
            return build(
                booking,
                actor,
                canCancel,
                canReschedule,
                canMarkNoShow,
                refundPreview,
                retainPreview,
                suggestedAction,
                reasons,
                "booking.actions.booking_not_active",
                params,
                "La reserva no admite acciones en su estado actual."
            );
        }

        if (actor.actorType() == BookingActionActor.BookingActionActorType.CLIENT) {
            if (!policy.allowClientCancellation()) {
                reasons.add(BookingActionReasonCode.CLIENT_CANCELLATION_DISABLED);
            } else if (bookingStarted) {
                reasons.add(BookingActionReasonCode.BOOKING_ALREADY_STARTED);
            } else {
                canCancel = true;
                boolean freeCancellation = policy.cancellationWindowHours() == null
                    || hoursUntilStart >= policy.cancellationWindowHours();
                boolean penaltyApplies = !freeCancellation
                    && policy.retainDepositOnLateCancellation()
                    && prepaidAmount.compareTo(BigDecimal.ZERO) > 0;

                if (freeCancellation) {
                    reasons.add(BookingActionReasonCode.FREE_CANCELLATION_WINDOW_OPEN);
                    refundPreview = prepaidAmount;
                    retainPreview = BigDecimal.ZERO;
                } else if (penaltyApplies) {
                    reasons.add(BookingActionReasonCode.LATE_CANCELLATION_PENALTY_APPLIES);
                    refundPreview = BigDecimal.ZERO;
                    retainPreview = prepaidAmount;
                } else {
                    refundPreview = prepaidAmount;
                    retainPreview = BigDecimal.ZERO;
                    if (prepaidAmount.compareTo(BigDecimal.ZERO) <= 0) {
                        reasons.add(BookingActionReasonCode.NO_PREPAID_AMOUNT);
                    }
                }
            }

            if (!policy.allowClientReschedule()) {
                reasons.add(BookingActionReasonCode.CLIENT_RESCHEDULE_DISABLED);
            } else if (bookingStarted) {
                reasons.add(BookingActionReasonCode.RESCHEDULE_WINDOW_CLOSED);
            } else if (policy.rescheduleWindowHours() != null && hoursUntilStart < policy.rescheduleWindowHours()) {
                reasons.add(BookingActionReasonCode.RESCHEDULE_WINDOW_CLOSED);
            } else if (booking.getRescheduleCount() != null && booking.getRescheduleCount() >= policy.maxClientReschedules()) {
                reasons.add(BookingActionReasonCode.RESCHEDULE_LIMIT_REACHED);
            } else {
                canReschedule = true;
                reasons.add(BookingActionReasonCode.RESCHEDULE_WINDOW_OPEN);
            }

            if (canReschedule && retainPreview.compareTo(BigDecimal.ZERO) > 0) {
                suggestedAction = BookingSuggestedAction.RESCHEDULE;
            }

            String messageCode;
            String fallback;
            if (suggestedAction == BookingSuggestedAction.RESCHEDULE) {
                messageCode = "booking.actions.suggest_reschedule_to_avoid_loss";
                fallback = "Conviene reagendar para evitar perder el monto prepagado.";
            } else if (canCancel && retainPreview.compareTo(BigDecimal.ZERO) == 0) {
                messageCode = "booking.actions.free_cancellation_available";
                fallback = "La reserva puede cancelarse sin penalidad.";
            } else if (canCancel) {
                messageCode = "booking.actions.late_cancellation_penalty";
                fallback = "La cancelación aplica retención sobre el monto prepagado.";
            } else if (canReschedule) {
                messageCode = "booking.actions.reschedule_only_available";
                fallback = "La reserva no conviene cancelarla, pero aún puede reagendarse.";
            } else {
                messageCode = "booking.actions.no_client_actions_available";
                fallback = "No hay acciones disponibles para esta reserva desde el lado del cliente.";
            }

            return build(
                booking,
                actor,
                canCancel,
                canReschedule,
                false,
                refundPreview,
                retainPreview,
                suggestedAction,
                reasons,
                messageCode,
                params,
                fallback
            );
        }

        if (bookingStarted) {
            reasons.add(BookingActionReasonCode.BOOKING_ALREADY_STARTED);
        }

        canCancel = !bookingStarted;
        if (canCancel) {
            refundPreview = prepaidAmount;
            retainPreview = BigDecimal.ZERO;
            reasons.add(BookingActionReasonCode.PROFESSIONAL_CANCELLATION_FULL_REFUND);
        }

        canReschedule = !bookingStarted;
        if (canReschedule) {
            reasons.add(BookingActionReasonCode.RESCHEDULE_WINDOW_OPEN);
        }

        canMarkNoShow = booking.getOperationalStatus() == BookingOperationalStatus.CONFIRMED && bookingStarted;
        if (canMarkNoShow) {
            reasons.add(BookingActionReasonCode.PROFESSIONAL_CAN_MARK_NO_SHOW);
        } else {
            reasons.add(BookingActionReasonCode.NO_SHOW_ONLY_AFTER_START);
        }

        String messageCode = canMarkNoShow
            ? "booking.actions.professional_can_mark_no_show"
            : canCancel
                ? "booking.actions.professional_cancel_would_refund"
                : "booking.actions.professional_no_actions_available";
        String fallback = canMarkNoShow
            ? "La reserva ya empezó y el profesional puede marcar no-show manualmente."
            : canCancel
                ? "Si el profesional cancela, el preview es devolución total del monto prepagado."
                : "No hay acciones disponibles para esta reserva desde el lado profesional.";

        return build(
            booking,
            actor,
            canCancel,
            canReschedule,
            canMarkNoShow,
            refundPreview,
            retainPreview,
            BookingSuggestedAction.NONE,
            reasons,
            messageCode,
            params,
            fallback
        );
    }

    private BookingActionsEvaluation build(
        Booking booking,
        BookingActionActor actor,
        boolean canCancel,
        boolean canReschedule,
        boolean canMarkNoShow,
        BigDecimal refundPreview,
        BigDecimal retainPreview,
        BookingSuggestedAction suggestedAction,
        List<BookingActionReasonCode> reasons,
        String messageCode,
        Map<String, String> params,
        String fallback
    ) {
        return new BookingActionsEvaluation(
            canCancel,
            canReschedule,
            canMarkNoShow,
            refundPreview,
            retainPreview,
            bookingMoneyResolver.resolveCurrency(booking),
            suggestedAction,
            reasons.stream().distinct().toList(),
            messageCode,
            Map.copyOf(params),
            fallback
        );
    }
}
