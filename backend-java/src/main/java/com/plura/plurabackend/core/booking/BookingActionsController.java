package com.plura.plurabackend.core.booking;

import com.plura.plurabackend.core.booking.dto.BookingActionsResponse;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * BookingActionsController es un controlador REST del modulo reservas.
 * Responsabilidad: recibir requests HTTP, validar acceso basico y delegar la operacion al servicio de aplicacion o dominio.
 * Superficie HTTP: traduce requests/responses y evita mezclar reglas de negocio en la capa web.
 * Foco funcional: reservas.
 */
@RestController
@RequestMapping({"/reservas", "/bookings"})
public class BookingActionsController {

    private final BookingActionsService bookingActionsService;

    public BookingActionsController(BookingActionsService bookingActionsService) {
        this.bookingActionsService = bookingActionsService;
    }

    @GetMapping("/{id}/actions")
    public BookingActionsResponse getActions(
        @PathVariable("id") Long bookingId,
        Authentication authentication
    ) {
        return bookingActionsService.getActions(bookingId, authentication);
    }
}
