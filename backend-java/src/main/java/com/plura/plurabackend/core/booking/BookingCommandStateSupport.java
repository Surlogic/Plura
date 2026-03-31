package com.plura.plurabackend.core.booking;

import com.plura.plurabackend.core.booking.actions.BookingActionsEvaluation;
import com.plura.plurabackend.core.booking.dto.BookingRescheduleRequest;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.core.booking.time.BookingDateTimeService;
import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class BookingCommandStateSupport {

    private final BookingDateTimeService bookingDateTimeService;

    public BookingCommandStateSupport(BookingDateTimeService bookingDateTimeService) {
        this.bookingDateTimeService = bookingDateTimeService;
    }

    public void requireAllowedAction(boolean allowed, BookingActionsEvaluation evaluation) {
        if (allowed) {
            return;
        }
        throw new ResponseStatusException(
            HttpStatus.CONFLICT,
            evaluation == null || evaluation.plainTextFallback() == null || evaluation.plainTextFallback().isBlank()
                ? "La acción no está permitida para esta reserva"
                : evaluation.plainTextFallback()
        );
    }

    public void ensureClientOwnsBooking(Long clientUserId, Booking booking) {
        if (booking.getUser() == null || !clientUserId.equals(booking.getUser().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado");
        }
    }

    public void ensureProfessionalOwnsBooking(Long professionalId, Booking booking) {
        if (booking.getProfessionalId() == null || !professionalId.equals(booking.getProfessionalId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado");
        }
    }

    public void validateBookingStatusTransition(BookingOperationalStatus current, BookingOperationalStatus next) {
        if (current == null || next == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Estado de reserva inválido");
        }
        if (current == next) {
            return;
        }

        boolean allowed = switch (current) {
            case PENDING -> next == BookingOperationalStatus.CONFIRMED || next == BookingOperationalStatus.CANCELLED;
            case CONFIRMED -> next == BookingOperationalStatus.COMPLETED
                || next == BookingOperationalStatus.CANCELLED
                || next == BookingOperationalStatus.NO_SHOW;
            case CANCELLED, COMPLETED, NO_SHOW -> false;
        };
        if (!allowed) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Transición de estado inválida");
        }
    }

    public Set<LocalDate> buildAffectedDates(LocalDate previousDate, LocalDate nextDate) {
        Set<LocalDate> affectedDates = new LinkedHashSet<>();
        affectedDates.add(previousDate);
        affectedDates.add(nextDate);
        return affectedDates;
    }

    public String resolveBookingTimezoneForReschedule(
        Booking booking,
        BookingRescheduleRequest request,
        String fallbackTimezone
    ) {
        // La agenda operativa y los slots públicos viven en la timezone del sistema.
        // Reagendar con una timezone arbitraria del cliente puede desalinear el bloqueo real.
        return fallbackTimezone;
    }
}
