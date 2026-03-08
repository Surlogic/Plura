package com.plura.plurabackend.booking;

import com.plura.plurabackend.booking.dto.BookingCancelRequest;
import com.plura.plurabackend.booking.dto.BookingCommandResponse;
import com.plura.plurabackend.booking.dto.BookingRescheduleRequest;
import com.plura.plurabackend.professional.BookingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/cliente/reservas")
public class ClientBookingCommandController {

    private final BookingService bookingService;

    public ClientBookingCommandController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping("/{id}/cancel")
    public BookingCommandResponse cancelBooking(
        @PathVariable("id") Long bookingId,
        @RequestBody(required = false) BookingCancelRequest request,
        @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
        Authentication authentication
    ) {
        return bookingService.cancelBookingAsClient(getClienteId(authentication), bookingId, request, idempotencyKey);
    }

    @PostMapping("/{id}/reschedule")
    @ResponseStatus(HttpStatus.OK)
    public BookingCommandResponse rescheduleBooking(
        @PathVariable("id") Long bookingId,
        @Valid @RequestBody BookingRescheduleRequest request,
        @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
        Authentication authentication
    ) {
        return bookingService.rescheduleBookingAsClient(
            getClienteId(authentication),
            bookingId,
            request,
            idempotencyKey
        );
    }

    private String getClienteId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No autenticado");
        }

        boolean isCliente = authentication.getAuthorities().stream()
            .anyMatch(auth -> "ROLE_USER".equals(auth.getAuthority()));
        if (!isCliente) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo clientes");
        }

        return authentication.getPrincipal().toString();
    }
}
