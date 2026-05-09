package com.plura.plurabackend.core.booking;

import com.plura.plurabackend.core.billing.providerops.ProviderOperationWorker;
import com.plura.plurabackend.core.booking.decision.model.BookingActionDecision;
import com.plura.plurabackend.core.booking.finance.BookingFinanceDispatchPlan;
import com.plura.plurabackend.core.booking.finance.BookingFinanceService;
import com.plura.plurabackend.core.booking.finance.BookingFinanceUpdateResult;
import com.plura.plurabackend.core.booking.model.Booking;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * BookingFinancialCommandSupport es un componente de dominio del modulo reservas.
 * Responsabilidad: encapsular comportamiento propio del modulo y mantenerlo fuera de controllers u otras capas.
 * Colabora con: bookingFinanceService, bookingPaymentsGateway, providerOperationWorker.
 * Foco funcional: reservas.
 */
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

    /**
     * Ejecuta la logica de process decision manteniendola encapsulada en este componente.
     */
    public BookingFinanceDispatchPlan processDecision(Booking booking, BookingActionDecision decision) {
        return bookingPaymentsGateway.processPostDecision(
            booking,
            bookingFinanceService.applyDecision(booking, decision)
        );
    }

    /**
     * Ejecuta la logica de retry liquidacion manteniendola encapsulada en este componente.
     */
    public BookingFinanceDispatchPlan retryPayout(Booking booking, com.plura.plurabackend.core.booking.finance.model.BookingPayoutRecord payoutRecord) {
        return bookingPaymentsGateway.retryPayout(booking, payoutRecord);
    }

    /**
     * Despacha planned operaciones fuera del flujo principal del request.
     */
    public BookingFinanceUpdateResult dispatchPlannedOperations(
        Booking booking,
        BookingFinanceDispatchPlan plan
    ) {
        return bookingPaymentsGateway.dispatchPlannedOperations(booking, plan);
    }

    /**
     * Despacha planned operaciones after commit fuera del flujo principal del request.
     */
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
    /**
     * Ejecuta la logica de despues commit manteniendola encapsulada en este componente.
     */
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
