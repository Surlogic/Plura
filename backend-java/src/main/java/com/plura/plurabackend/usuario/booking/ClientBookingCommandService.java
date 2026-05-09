package com.plura.plurabackend.usuario.booking;

import com.plura.plurabackend.core.booking.BookingCommandWorkflowService;
import com.plura.plurabackend.core.booking.dto.BookingCancelRequest;
import com.plura.plurabackend.core.booking.dto.BookingCommandResponse;
import com.plura.plurabackend.core.booking.dto.BookingRescheduleRequest;
import org.springframework.stereotype.Service;

/**
 * ClientBookingCommandService es un servicio de negocio del modulo cliente / reservas.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: bookingCommandWorkflowService.
 * Foco funcional: reservas, servicios, clientes.
 */
@Service
public class ClientBookingCommandService {

    private final BookingCommandWorkflowService bookingCommandWorkflowService;

    public ClientBookingCommandService(BookingCommandWorkflowService bookingCommandWorkflowService) {
        this.bookingCommandWorkflowService = bookingCommandWorkflowService;
    }

    /**
     * Cancela booking respetando reglas de estado.
     */
    public BookingCommandResponse cancelBooking(
        String rawUserId,
        Long bookingId,
        BookingCancelRequest request,
        String idempotencyKey
    ) {
        return bookingCommandWorkflowService.cancelBookingAsClient(rawUserId, bookingId, request, idempotencyKey);
    }

    /**
     * Ejecuta la logica de reschedule reserva manteniendola encapsulada en este componente.
     */
    public BookingCommandResponse rescheduleBooking(
        String rawUserId,
        Long bookingId,
        BookingRescheduleRequest request,
        String idempotencyKey
    ) {
        return bookingCommandWorkflowService.rescheduleBookingAsClient(rawUserId, bookingId, request, idempotencyKey);
    }
}
