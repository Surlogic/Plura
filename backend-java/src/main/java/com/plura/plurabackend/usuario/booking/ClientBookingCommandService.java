package com.plura.plurabackend.usuario.booking;

import com.plura.plurabackend.core.booking.BookingCommandWorkflowService;
import com.plura.plurabackend.core.booking.dto.BookingCancelRequest;
import com.plura.plurabackend.core.booking.dto.BookingCommandResponse;
import com.plura.plurabackend.core.booking.dto.BookingRescheduleRequest;
import org.springframework.stereotype.Service;

@Service
public class ClientBookingCommandService {

    private final BookingCommandWorkflowService bookingCommandWorkflowService;

    public ClientBookingCommandService(BookingCommandWorkflowService bookingCommandWorkflowService) {
        this.bookingCommandWorkflowService = bookingCommandWorkflowService;
    }

    public BookingCommandResponse cancelBooking(
        String rawUserId,
        Long bookingId,
        BookingCancelRequest request,
        String idempotencyKey
    ) {
        return bookingCommandWorkflowService.cancelBookingAsClient(rawUserId, bookingId, request, idempotencyKey);
    }

    public BookingCommandResponse rescheduleBooking(
        String rawUserId,
        Long bookingId,
        BookingRescheduleRequest request,
        String idempotencyKey
    ) {
        return bookingCommandWorkflowService.rescheduleBookingAsClient(rawUserId, bookingId, request, idempotencyKey);
    }
}
