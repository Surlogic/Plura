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

/**
 * BookingCommandStateSupport es un componente de dominio del modulo reservas.
 * Responsabilidad: encapsular comportamiento propio del modulo y mantenerlo fuera de controllers u otras capas.
 * Colabora con: bookingDateTimeService.
 * Foco funcional: reservas.
 */
@Component
public class BookingCommandStateSupport {

    private final BookingDateTimeService bookingDateTimeService;

    public BookingCommandStateSupport(BookingDateTimeService bookingDateTimeService) {
        this.bookingDateTimeService = bookingDateTimeService;
    }

    /**
     * Exige allowed action y corta la ejecucion si falta autorizacion o contexto.
     * Esta separacion hace explicita la regla de seguridad o negocio que protege el flujo.
     */
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

    /**
     * Ejecuta la logica de ensure cliente owns reserva manteniendola encapsulada en este componente.
     */
    public void ensureClientOwnsBooking(Long clientUserId, Booking booking) {
        if (booking.getUser() == null || !clientUserId.equals(booking.getUser().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado");
        }
    }

    /**
     * Ejecuta la logica de ensure profesional owns reserva manteniendola encapsulada en este componente.
     */
    public void ensureProfessionalOwnsBooking(Long professionalId, Booking booking) {
        if (booking.getProfessionalId() == null || !professionalId.equals(booking.getProfessionalId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado");
        }
    }

    /**
     * Valida reserva estado transition y lanza un error controlado si no cumple el contrato.
     * Esta separacion hace explicita la regla de seguridad o negocio que protege el flujo.
     */
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

    /**
     * Construye affected dates a partir de datos internos ya validados.
     */
    public Set<LocalDate> buildAffectedDates(LocalDate previousDate, LocalDate nextDate) {
        Set<LocalDate> affectedDates = new LinkedHashSet<>();
        affectedDates.add(previousDate);
        affectedDates.add(nextDate);
        return affectedDates;
    }

    /**
     * Resuelve reserva timezone for reschedule normalizando entradas, defaults y casos borde.
     */
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
