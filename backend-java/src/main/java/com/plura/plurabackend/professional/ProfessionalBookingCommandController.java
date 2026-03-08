package com.plura.plurabackend.professional;

import com.plura.plurabackend.booking.dto.BookingCancelRequest;
import com.plura.plurabackend.booking.dto.BookingCommandResponse;
import com.plura.plurabackend.booking.dto.BookingRescheduleRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/profesional/reservas")
public class ProfessionalBookingCommandController {

    private final ProfessionalPublicPageService professionalPublicPageService;

    public ProfessionalBookingCommandController(ProfessionalPublicPageService professionalPublicPageService) {
        this.professionalPublicPageService = professionalPublicPageService;
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

    @PostMapping("/{id}/payout/retry")
    public BookingCommandResponse retryPayout(
        @PathVariable("id") Long bookingId,
        @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        return professionalPublicPageService.retryBookingPayout(getProfesionalId(), bookingId, idempotencyKey);
    }

    private String getProfesionalId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sin sesión activa");
        }

        boolean isProfesional = authentication.getAuthorities().stream()
            .anyMatch(auth -> "ROLE_PROFESSIONAL".equals(auth.getAuthority()));
        if (!isProfesional) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo profesionales");
        }

        return authentication.getPrincipal().toString();
    }
}
