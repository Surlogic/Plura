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

    public PublicBookingResponse createPublicBooking(String slug, PublicBookingRequest request, String rawUserId) {
        return bookingCommandApplicationService.createPublicBooking(slug, request, rawUserId);
    }

    public List<ProfessionalBookingResponse> getProfessionalBookings(
        String rawUserId,
        String rawDate,
        String rawDateFrom,
        String rawDateTo
    ) {
        return bookingQueryApplicationService.getProfessionalBookings(rawUserId, rawDate, rawDateFrom, rawDateTo);
    }

    public ProfessionalBookingResponse createProfessionalBooking(
        String rawUserId,
        ProfessionalBookingCreateRequest request
    ) {
        return bookingCommandApplicationService.createProfessionalBooking(rawUserId, request);
    }

    public ProfessionalBookingResponse updateProfessionalBooking(
        String rawUserId,
        Long bookingId,
        ProfessionalBookingUpdateRequest request
    ) {
        return bookingCommandApplicationService.updateProfessionalBooking(rawUserId, bookingId, request);
    }

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

    private Long parseUserId(String rawUserId) {
        try {
            return Long.valueOf(rawUserId);
        } catch (NumberFormatException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesión inválida");
        }
    }
}
