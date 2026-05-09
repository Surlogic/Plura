package com.plura.plurabackend.usuario.booking;

import com.plura.plurabackend.core.booking.dto.ClientNextBookingResponse;
import com.plura.plurabackend.core.security.RoleGuard;
import java.util.List;
import java.util.Optional;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * BookingClientController es un controlador REST del modulo cliente / reservas.
 * Responsabilidad: recibir requests HTTP, validar acceso basico y delegar la operacion al servicio de aplicacion o dominio.
 * Superficie HTTP: traduce requests/responses y evita mezclar reglas de negocio en la capa web.
 * Foco funcional: reservas, clientes.
 */
@RestController
@RequestMapping({"/cliente/reservas", "/bookings"})
public class BookingClientController {

    private final BookingClientService bookingClientService;
    private final RoleGuard roleGuard;

    public BookingClientController(BookingClientService bookingClientService, RoleGuard roleGuard) {
        this.bookingClientService = bookingClientService;
        this.roleGuard = roleGuard;
    }

    @GetMapping({"", "/me"})
    public List<ClientNextBookingResponse> getBookings() {
        String rawUserId = getClienteId();
        return bookingClientService.getBookings(rawUserId);
    }

    @GetMapping("/proxima")
    public ResponseEntity<ClientNextBookingResponse> getNextBooking() {
        String rawUserId = getClienteId();
        Optional<ClientNextBookingResponse> response = bookingClientService.getNextBooking(rawUserId);
        return response.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.noContent().build());
    }

    private String getClienteId() {
        return String.valueOf(roleGuard.requireUser());
    }
}
