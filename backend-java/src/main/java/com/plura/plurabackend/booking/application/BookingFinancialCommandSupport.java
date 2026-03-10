package com.plura.plurabackend.booking.application;

import com.plura.plurabackend.billing.providerops.ProviderOperationWorker;
import com.plura.plurabackend.booking.decision.model.BookingActionDecision;
import com.plura.plurabackend.booking.finance.BookingFinanceDispatchPlan;
import com.plura.plurabackend.booking.finance.BookingFinanceService;
import com.plura.plurabackend.booking.finance.BookingFinanceUpdateResult;
import com.plura.plurabackend.booking.model.Booking;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Component
public class BookingFinancialCommandSupport {

    private final BookingFinanceService bookingFinanceService;
    private final BookingPaymentsGateway bookingPaymentsGateway;
    private final ProviderOperationWorker providerOperationWorker;

    public BookingFinancialCommandSupport(
        BookingFinanceService bookingFinanceService,
        BookingPaymentsGateway bookingPaymentsGateway,
        ProviderOperationWorker providerOperationWorker
    ) {
        this.bookingFinanceService = bookingFinanceService;
        this.bookingPaymentsGateway = bookingPaymentsGateway;
        this.providerOperationWorker = providerOperationWorker;
    }

    public BookingFinanceDispatchPlan processDecision(Booking booking, BookingActionDecision decision) {
        return bookingPaymentsGateway.processPostDecision(
            booking,
            bookingFinanceService.applyDecision(booking, decision)
        );
    }

    public BookingFinanceDispatchPlan retryPayout(Booking booking, com.plura.plurabackend.booking.finance.model.BookingPayoutRecord payoutRecord) {
        return bookingPaymentsGateway.retryPayout(booking, payoutRecord);
    }

    public BookingFinanceUpdateResult dispatchPlannedOperations(
        Booking booking,
        BookingFinanceDispatchPlan plan
    ) {
        return bookingPaymentsGateway.dispatchPlannedOperations(booking, plan);
    }

    public void dispatchPlannedOperationsAfterCommit(
        Booking booking,
        BookingFinanceDispatchPlan plan
    ) {
        if (plan == null || !plan.hasProviderOperations()) {
            return;
        }
        Runnable action = () -> providerOperationWorker.kickOperationsAsync(plan.providerOperationIds());
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
            return;
        }
        action.run();
    }
}
