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

    @PostMapping("/{id}/no-show")
    public BookingCommandResponse markNoShow(
        @PathVariable("id") Long bookingId,
        @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        return professionalPublicPageService.markBookingNoShow(getProfesionalId(), bookingId, idempotencyKey);
    }

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
