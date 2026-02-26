package com.plura.plurabackend.booking;

import com.plura.plurabackend.booking.dto.ClientNextBookingResponse;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/cliente/reservas")
public class BookingClientController {

    private final BookingClientService bookingClientService;

    public BookingClientController(BookingClientService bookingClientService) {
        this.bookingClientService = bookingClientService;
    }

    @GetMapping("/proxima")
    public ResponseEntity<ClientNextBookingResponse> getNextBooking(Authentication authentication) {
        String rawUserId = getClienteId(authentication);
        Optional<ClientNextBookingResponse> response = bookingClientService.getNextBooking(rawUserId);
        return response.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.noContent().build());
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
