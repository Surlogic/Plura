package com.plura.plurabackend.core.booking;

import com.plura.plurabackend.core.booking.dto.BookingPaymentSessionRequest;
import com.plura.plurabackend.core.booking.dto.BookingPaymentSessionResponse;
import com.plura.plurabackend.core.booking.finance.BookingFinanceDispatchPlan;
import com.plura.plurabackend.core.booking.finance.BookingFinanceUpdateResult;
import com.plura.plurabackend.core.booking.finance.model.BookingPayoutRecord;
import com.plura.plurabackend.core.booking.model.Booking;

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
