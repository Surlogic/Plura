package com.plura.plurabackend.usuario.booking;

import com.plura.plurabackend.core.booking.BookingPaymentsGateway;
import com.plura.plurabackend.core.booking.dto.BookingPaymentSessionRequest;
import com.plura.plurabackend.core.booking.dto.BookingPaymentSessionResponse;
import com.plura.plurabackend.core.security.RoleGuard;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/cliente/reservas")
public class BookingPaymentController {

    private final BookingPaymentsGateway bookingPaymentsGateway;
    private final RoleGuard roleGuard;

    public BookingPaymentController(BookingPaymentsGateway bookingPaymentsGateway, RoleGuard roleGuard) {
        this.bookingPaymentsGateway = bookingPaymentsGateway;
        this.roleGuard = roleGuard;
    }

    @PostMapping("/{id}/payment-session")
    @ResponseStatus(HttpStatus.OK)
    public BookingPaymentSessionResponse createPaymentSession(
        @PathVariable("id") Long bookingId,
        @Valid @RequestBody(required = false) BookingPaymentSessionRequest request
    ) {
        return bookingPaymentsGateway.createPaymentSessionForClient(
            getClienteId(),
            bookingId,
            request
        );
    }

    private String getClienteId() {
        return String.valueOf(roleGuard.requireUser());
    }
}
