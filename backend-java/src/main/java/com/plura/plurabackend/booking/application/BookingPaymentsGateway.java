package com.plura.plurabackend.booking.application;

import com.plura.plurabackend.booking.dto.BookingPaymentSessionRequest;
import com.plura.plurabackend.booking.dto.BookingPaymentSessionResponse;
import com.plura.plurabackend.booking.finance.BookingFinanceDispatchPlan;
import com.plura.plurabackend.booking.finance.BookingFinanceUpdateResult;
import com.plura.plurabackend.booking.finance.model.BookingPayoutRecord;
import com.plura.plurabackend.booking.model.Booking;

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
