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

/**
 * BookingPaymentController es un controlador REST del modulo cliente / reservas.
 * Responsabilidad: recibir requests HTTP, validar acceso basico y delegar la operacion al servicio de aplicacion o dominio.
 * Superficie HTTP: atiende rutas bajo /cliente/reservas y deja la logica pesada en servicios.
 * Foco funcional: reservas, pagos.
 */
@RestController
@RequestMapping("/cliente/reservas")
public class BookingPaymentController {

    private final BookingPaymentsGateway bookingPaymentsGateway;
    private final RoleGuard roleGuard;

    public BookingPaymentController(BookingPaymentsGateway bookingPaymentsGateway, RoleGuard roleGuard) {
        this.bookingPaymentsGateway = bookingPaymentsGateway;
        this.roleGuard = roleGuard;
    }

    /**
     * Endpoint POST /{id}/payment-session: Crea pago sesion validando datos de entrada y persistiendo el resultado.
     * Valida parametros/autorizacion de entrada y delega la logica de negocio al servicio correspondiente.
     */
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
