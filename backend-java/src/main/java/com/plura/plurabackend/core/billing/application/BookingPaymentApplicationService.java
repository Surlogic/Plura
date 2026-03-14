package com.plura.plurabackend.core.billing.application;

import com.plura.plurabackend.core.booking.BookingPaymentsGateway;
import com.plura.plurabackend.core.booking.dto.BookingPaymentSessionRequest;
import com.plura.plurabackend.core.booking.dto.BookingPaymentSessionResponse;
import com.plura.plurabackend.core.booking.finance.BookingFinanceDispatchPlan;
import com.plura.plurabackend.core.booking.finance.BookingFinanceUpdateResult;
import com.plura.plurabackend.core.booking.finance.BookingProviderIntegrationService;
import com.plura.plurabackend.core.booking.finance.model.BookingPayoutRecord;
import com.plura.plurabackend.core.booking.model.Booking;
import org.springframework.stereotype.Service;

@Service
public class BookingPaymentApplicationService implements BookingPaymentsGateway {

    private final BookingProviderIntegrationService bookingProviderIntegrationService;

    public BookingPaymentApplicationService(BookingProviderIntegrationService bookingProviderIntegrationService) {
        this.bookingProviderIntegrationService = bookingProviderIntegrationService;
    }

    @Override
    public BookingPaymentSessionResponse createPaymentSessionForClient(
        String rawUserId,
        Long bookingId,
        BookingPaymentSessionRequest request
    ) {
        return bookingProviderIntegrationService.createPaymentSessionForClient(rawUserId, bookingId, request);
    }

    @Override
    public boolean syncPendingChargeStatus(Long bookingId) {
        return bookingProviderIntegrationService.syncPendingChargeStatus(bookingId);
    }

    @Override
    public BookingFinanceDispatchPlan processPostDecision(
        Booking booking,
        BookingFinanceUpdateResult financeResult
    ) {
        return bookingProviderIntegrationService.processPostDecision(booking, financeResult);
    }

    @Override
    public BookingFinanceDispatchPlan retryPayout(
        Booking booking,
        BookingPayoutRecord payoutRecord
    ) {
        return bookingProviderIntegrationService.retryPayout(booking, payoutRecord);
    }

    @Override
    public BookingFinanceUpdateResult dispatchPlannedOperations(
        Booking booking,
        BookingFinanceDispatchPlan plan
    ) {
        return bookingProviderIntegrationService.dispatchPlannedOperations(booking, plan);
    }
}
