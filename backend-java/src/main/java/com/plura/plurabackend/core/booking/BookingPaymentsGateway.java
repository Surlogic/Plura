package com.plura.plurabackend.core.booking;

import com.plura.plurabackend.core.booking.dto.BookingPaymentSessionRequest;
import com.plura.plurabackend.core.booking.dto.BookingPaymentSessionResponse;
import com.plura.plurabackend.core.booking.finance.BookingFinanceDispatchPlan;
import com.plura.plurabackend.core.booking.finance.BookingFinanceUpdateResult;
import com.plura.plurabackend.core.booking.finance.model.BookingPayoutRecord;
import com.plura.plurabackend.core.booking.model.Booking;

/**
 * BookingPaymentsGateway es un contrato interno del modulo reservas.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: reservas, pagos.
 */
public interface BookingPaymentsGateway {

    BookingPaymentSessionResponse createPaymentSessionForClient(
        String rawUserId,
        Long bookingId,
        BookingPaymentSessionRequest request
    );

    boolean syncPendingChargeStatus(Long bookingId);

    BookingFinanceDispatchPlan processPostDecision(
        Booking booking,
        BookingFinanceUpdateResult financeResult
    );

    BookingFinanceDispatchPlan retryPayout(
        Booking booking,
        BookingPayoutRecord payoutRecord
    );

    BookingFinanceUpdateResult dispatchPlannedOperations(
        Booking booking,
        BookingFinanceDispatchPlan plan
    );
}
