package com.plura.plurabackend.usuario.booking;

import com.plura.plurabackend.core.booking.dto.BookingCancelRequest;
import com.plura.plurabackend.core.booking.dto.BookingCommandResponse;
import com.plura.plurabackend.core.booking.dto.BookingRescheduleRequest;
import com.plura.plurabackend.core.security.RoleGuard;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * ClientBookingCommandController es un controlador REST del modulo cliente / reservas.
 * Responsabilidad: recibir requests HTTP, validar acceso basico y delegar la operacion al servicio de aplicacion o dominio.
 * Superficie HTTP: atiende rutas bajo /cliente/reservas y deja la logica pesada en servicios.
 * Foco funcional: reservas, clientes.
 */
@RestController
@RequestMapping("/cliente/reservas")
public class ClientBookingCommandController {

    private final ClientBookingCommandService clientBookingCommandService;
    private final RoleGuard roleGuard;

    public ClientBookingCommandController(ClientBookingCommandService clientBookingCommandService, RoleGuard roleGuard) {
        this.clientBookingCommandService = clientBookingCommandService;
        this.roleGuard = roleGuard;
    }

    /**
     * Endpoint POST /{id}/cancel: Cancela reserva respetando estados validos y efectos secundarios.
     * Valida parametros/autorizacion de entrada y delega la logica de negocio al servicio correspondiente.
     */
    @PostMapping("/{id}/cancel")
    public BookingCommandResponse cancelBooking(
        @PathVariable("id") Long bookingId,
        @RequestBody(required = false) BookingCancelRequest request,
        @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        return clientBookingCommandService.cancelBooking(getClienteId(), bookingId, request, idempotencyKey);
    }

    /**
     * Ejecuta la logica de reschedule reserva manteniendola encapsulada en este componente.
     */
    @PostMapping("/{id}/reschedule")
    @ResponseStatus(HttpStatus.OK)
    public BookingCommandResponse rescheduleBooking(
        @PathVariable("id") Long bookingId,
        @Valid @RequestBody BookingRescheduleRequest request,
        @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        return clientBookingCommandService.rescheduleBooking(
            getClienteId(),
            bookingId,
            request,
            idempotencyKey
        );
    }

    private String getClienteId() {
        return String.valueOf(roleGuard.requireUser());
    }
}
