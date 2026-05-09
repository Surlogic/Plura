package com.plura.plurabackend.professional.booking;

import com.plura.plurabackend.core.booking.dto.BookingCancelRequest;
import com.plura.plurabackend.core.booking.dto.BookingCommandResponse;
import com.plura.plurabackend.core.booking.dto.BookingRescheduleRequest;
import com.plura.plurabackend.core.security.RoleGuard;
import com.plura.plurabackend.professional.profile.ProfessionalPublicPageService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * ProfessionalBookingCommandController es un controlador REST del modulo profesionales / reservas.
 * Responsabilidad: recibir requests HTTP, validar acceso basico y delegar la operacion al servicio de aplicacion o dominio.
 * Superficie HTTP: atiende rutas bajo /profesional/reservas y deja la logica pesada en servicios.
 * Foco funcional: profesionales, reservas.
 */
@RestController
@RequestMapping("/profesional/reservas")
public class ProfessionalBookingCommandController {

    private final ProfessionalPublicPageService professionalPublicPageService;
    private final RoleGuard roleGuard;

    public ProfessionalBookingCommandController(
        ProfessionalPublicPageService professionalPublicPageService,
        RoleGuard roleGuard
    ) {
        this.professionalPublicPageService = professionalPublicPageService;
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
        return professionalPublicPageService.cancelBookingAsProfessional(
            getProfesionalId(),
            bookingId,
            request,
            idempotencyKey
        );
    }

    /**
     * Ejecuta la logica de reschedule reserva manteniendola encapsulada en este componente.
     */
    @PostMapping("/{id}/reschedule")
    public BookingCommandResponse rescheduleBooking(
        @PathVariable("id") Long bookingId,
        @Valid @RequestBody BookingRescheduleRequest request,
        @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        return professionalPublicPageService.rescheduleBookingAsProfessional(
            getProfesionalId(),
            bookingId,
            request,
            idempotencyKey
        );
    }

    /**
     * Marca no show y actualiza los indicadores relacionados.
     */
    @PostMapping("/{id}/no-show")
    public BookingCommandResponse markNoShow(
        @PathVariable("id") Long bookingId,
        @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        return professionalPublicPageService.markBookingNoShow(getProfesionalId(), bookingId, idempotencyKey);
    }

    /**
     * Endpoint POST /{id}/complete: Completa reserva y deja persistido el estado final del flujo.
     * Valida parametros/autorizacion de entrada y delega la logica de negocio al servicio correspondiente.
     */
    @PostMapping("/{id}/complete")
    public BookingCommandResponse completeBooking(
        @PathVariable("id") Long bookingId,
        @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        return professionalPublicPageService.completeBooking(getProfesionalId(), bookingId, idempotencyKey);
    }

    private String getProfesionalId() {
        return String.valueOf(roleGuard.requireProfessional());
    }
}
