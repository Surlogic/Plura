package com.plura.plurabackend.professional.booking;

import com.plura.plurabackend.core.booking.BookingCommandWorkflowService;
import com.plura.plurabackend.core.booking.dto.BookingCancelRequest;
import com.plura.plurabackend.core.booking.dto.BookingCommandResponse;
import com.plura.plurabackend.core.booking.dto.BookingRescheduleRequest;
import com.plura.plurabackend.core.booking.dto.ProfessionalBookingResponse;
import com.plura.plurabackend.core.booking.dto.ProfessionalBookingCreateRequest;
import com.plura.plurabackend.core.booking.dto.ProfessionalBookingUpdateRequest;
import com.plura.plurabackend.core.booking.dto.PublicBookingRequest;
import com.plura.plurabackend.core.booking.decision.model.BookingActionType;
import com.plura.plurabackend.core.booking.event.model.BookingActorType;
import com.plura.plurabackend.core.booking.idempotency.BookingCommandIdempotencyService;
import com.plura.plurabackend.core.booking.dto.PublicBookingResponse;
import com.plura.plurabackend.professional.booking.application.BookingCommandApplicationService;
import com.plura.plurabackend.professional.booking.application.BookingQueryApplicationService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * BookingService es un servicio de negocio del modulo profesionales / reservas.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: bookingCommandApplicationService, bookingQueryApplicationService, bookingCommandIdempotencyService.
 * Foco funcional: reservas, servicios.
 */
@Service
public class BookingService implements BookingCommandWorkflowService {

    private final BookingCommandApplicationService bookingCommandApplicationService;
    private final BookingQueryApplicationService bookingQueryApplicationService;
    private final BookingCommandIdempotencyService bookingCommandIdempotencyService;

    public BookingService(
        BookingCommandApplicationService bookingCommandApplicationService,
        BookingQueryApplicationService bookingQueryApplicationService,
        BookingCommandIdempotencyService bookingCommandIdempotencyService
    ) {
        this.bookingCommandApplicationService = bookingCommandApplicationService;
        this.bookingQueryApplicationService = bookingQueryApplicationService;
        this.bookingCommandIdempotencyService = bookingCommandIdempotencyService;
    }

    /**
     * Crea publico reserva validando datos de entrada y persistiendo el resultado.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    public PublicBookingResponse createPublicBooking(String slug, PublicBookingRequest request, String rawUserId) {
        return createPublicBooking(slug, request, rawUserId, null);
    }

    /**
     * Crea publico reserva validando datos de entrada y persistiendo el resultado.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    public PublicBookingResponse createPublicBooking(
        String slug,
        PublicBookingRequest request,
        String rawUserId,
        String sourcePlatform
    ) {
        return bookingCommandApplicationService.createPublicBooking(slug, request, rawUserId, sourcePlatform);
    }

    /**
     * Crea publico reserva validando datos de entrada y persistiendo el resultado.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    public List<ProfessionalBookingResponse> getProfessionalBookings(
        String rawUserId,
        String rawDate,
        String rawDateFrom,
        String rawDateTo
    ) {
        return bookingQueryApplicationService.getProfessionalBookings(rawUserId, rawDate, rawDateFrom, rawDateTo);
    }

    /**
     * Crea profesional reserva validando datos de entrada y persistiendo el resultado.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    public ProfessionalBookingResponse createProfessionalBooking(
        String rawUserId,
        ProfessionalBookingCreateRequest request
    ) {
        return bookingCommandApplicationService.createProfessionalBooking(rawUserId, request);
    }

    /**
     * Actualiza profesional reserva manteniendo reglas de negocio y consistencia de datos.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    public ProfessionalBookingResponse updateProfessionalBooking(
        String rawUserId,
        Long bookingId,
        ProfessionalBookingUpdateRequest request
    ) {
        return bookingCommandApplicationService.updateProfessionalBooking(rawUserId, bookingId, request);
    }

    /**
     * Cancela booking as client respetando reglas de estado.
     */
    @Override
    public BookingCommandResponse cancelBookingAsClient(
        String rawUserId,
        Long bookingId,
        BookingCancelRequest request,
        String idempotencyKey
    ) {
        Long actorUserId = parseUserId(rawUserId);
        return bookingCommandIdempotencyService.execute(
            BookingActionType.CANCEL,
            BookingActorType.CLIENT,
            actorUserId,
            bookingId,
            idempotencyKey,
            request,
            () -> bookingCommandApplicationService.cancelBookingAsClient(rawUserId, bookingId, request)
        );
    }

    /**
     * Ejecuta la logica de reschedule reserva como cliente manteniendola encapsulada en este componente.
     */
    @Override
    public BookingCommandResponse rescheduleBookingAsClient(
        String rawUserId,
        Long bookingId,
        BookingRescheduleRequest request,
        String idempotencyKey
    ) {
        Long actorUserId = parseUserId(rawUserId);
        return bookingCommandIdempotencyService.execute(
            BookingActionType.RESCHEDULE,
            BookingActorType.CLIENT,
            actorUserId,
            bookingId,
            idempotencyKey,
            request,
            () -> bookingCommandApplicationService.rescheduleBookingAsClient(rawUserId, bookingId, request)
        );
    }

    /**
     * Cancela booking as professional respetando reglas de estado.
     */
    public BookingCommandResponse cancelBookingAsProfessional(
        String rawUserId,
        Long bookingId,
        BookingCancelRequest request,
        String idempotencyKey
    ) {
        Long actorUserId = parseUserId(rawUserId);
        return bookingCommandIdempotencyService.execute(
            BookingActionType.CANCEL,
            BookingActorType.PROFESSIONAL,
            actorUserId,
            bookingId,
            idempotencyKey,
            request,
            () -> bookingCommandApplicationService.cancelBookingAsProfessional(rawUserId, bookingId, request)
        );
    }

    /**
     * Ejecuta la logica de reschedule reserva como profesional manteniendola encapsulada en este componente.
     */
    public BookingCommandResponse rescheduleBookingAsProfessional(
        String rawUserId,
        Long bookingId,
        BookingRescheduleRequest request,
        String idempotencyKey
    ) {
        Long actorUserId = parseUserId(rawUserId);
        return bookingCommandIdempotencyService.execute(
            BookingActionType.RESCHEDULE,
            BookingActorType.PROFESSIONAL,
            actorUserId,
            bookingId,
            idempotencyKey,
            request,
            () -> bookingCommandApplicationService.rescheduleBookingAsProfessional(rawUserId, bookingId, request)
        );
    }

    /**
     * Marca reserva no show y actualiza los indicadores relacionados.
     */
    public BookingCommandResponse markBookingNoShow(
        String rawUserId,
        Long bookingId,
        String idempotencyKey
    ) {
        Long actorUserId = parseUserId(rawUserId);
        return bookingCommandIdempotencyService.execute(
            BookingActionType.NO_SHOW,
            BookingActorType.PROFESSIONAL,
            actorUserId,
            bookingId,
            idempotencyKey,
            null,
            () -> bookingCommandApplicationService.markBookingNoShow(rawUserId, bookingId)
        );
    }

    /**
     * Completa reserva y deja persistido el estado final del flujo.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    public BookingCommandResponse completeBooking(
        String rawUserId,
        Long bookingId,
        String idempotencyKey
    ) {
        Long actorUserId = parseUserId(rawUserId);
        return bookingCommandIdempotencyService.execute(
            BookingActionType.COMPLETE,
            BookingActorType.PROFESSIONAL,
            actorUserId,
            bookingId,
            idempotencyKey,
            null,
            () -> bookingCommandApplicationService.completeBooking(rawUserId, bookingId)
        );
    }

    /**
     * Parsea usuario ID y convierte errores de formato en errores controlados.
     */
    private Long parseUserId(String rawUserId) {
        try {
            return Long.valueOf(rawUserId);
        } catch (NumberFormatException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesión inválida");
        }
    }
}
