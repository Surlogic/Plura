package com.plura.plurabackend.booking;

import com.plura.plurabackend.booking.application.BookingPaymentsGateway;
import com.plura.plurabackend.booking.dto.BookingPaymentSessionRequest;
import com.plura.plurabackend.booking.dto.BookingPaymentSessionResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/cliente/reservas")
public class BookingPaymentController {

    private final BookingPaymentsGateway bookingPaymentsGateway;

    public BookingPaymentController(BookingPaymentsGateway bookingPaymentsGateway) {
        this.bookingPaymentsGateway = bookingPaymentsGateway;
    }

    @PostMapping("/{id}/payment-session")
    @ResponseStatus(HttpStatus.OK)
    public BookingPaymentSessionResponse createPaymentSession(
        @PathVariable("id") Long bookingId,
        @Valid @RequestBody(required = false) BookingPaymentSessionRequest request,
        Authentication authentication
    ) {
        return bookingPaymentsGateway.createPaymentSessionForClient(
            getClienteId(authentication),
            bookingId,
            request
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
