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

/**
 * BookingPaymentApplicationService es un servicio de negocio del modulo billing / aplicacion.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: bookingProviderIntegrationService.
 * Foco funcional: reservas, pagos, servicios.
 */
@Service
public class BookingPaymentApplicationService implements BookingPaymentsGateway {

    private final BookingProviderIntegrationService bookingProviderIntegrationService;

    public BookingPaymentApplicationService(BookingProviderIntegrationService bookingProviderIntegrationService) {
        this.bookingProviderIntegrationService = bookingProviderIntegrationService;
    }

    /**
     * Crea pago sesion for cliente validando datos de entrada y persistiendo el resultado.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    @Override
    public BookingPaymentSessionResponse createPaymentSessionForClient(
        String rawUserId,
        Long bookingId,
        BookingPaymentSessionRequest request
    ) {
        return bookingProviderIntegrationService.createPaymentSessionForClient(rawUserId, bookingId, request);
    }

    /**
     * Ejecuta la logica de sincronizar pending charge estado manteniendola encapsulada en este componente.
     */
    @Override
    public boolean syncPendingChargeStatus(Long bookingId) {
        return bookingProviderIntegrationService.syncPendingChargeStatus(bookingId);
    }

    /**
     * Ejecuta la logica de process post decision manteniendola encapsulada en este componente.
     */
    @Override
    public BookingFinanceDispatchPlan processPostDecision(
        Booking booking,
        BookingFinanceUpdateResult financeResult
    ) {
        return bookingProviderIntegrationService.processPostDecision(booking, financeResult);
    }

    /**
     * Ejecuta la logica de retry liquidacion manteniendola encapsulada en este componente.
     */
    @Override
    public BookingFinanceDispatchPlan retryPayout(
        Booking booking,
        BookingPayoutRecord payoutRecord
    ) {
        return bookingProviderIntegrationService.retryPayout(booking, payoutRecord);
    }

    /**
     * Despacha planned operaciones fuera del flujo principal del request.
     */
    @Override
    public BookingFinanceUpdateResult dispatchPlannedOperations(
        Booking booking,
        BookingFinanceDispatchPlan plan
    ) {
        return bookingProviderIntegrationService.dispatchPlannedOperations(booking, plan);
    }
}
