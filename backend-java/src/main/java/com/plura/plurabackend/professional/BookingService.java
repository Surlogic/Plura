package com.plura.plurabackend.professional;

import com.plura.plurabackend.booking.dto.BookingCancelRequest;
import com.plura.plurabackend.booking.dto.BookingCommandResponse;
import com.plura.plurabackend.booking.dto.BookingRescheduleRequest;
import com.plura.plurabackend.booking.dto.ProfessionalBookingResponse;
import com.plura.plurabackend.booking.dto.ProfessionalBookingCreateRequest;
import com.plura.plurabackend.booking.dto.ProfessionalBookingUpdateRequest;
import com.plura.plurabackend.booking.dto.PublicBookingRequest;
import com.plura.plurabackend.booking.decision.model.BookingActionType;
import com.plura.plurabackend.booking.event.model.BookingActorType;
import com.plura.plurabackend.booking.idempotency.BookingCommandIdempotencyService;
import com.plura.plurabackend.booking.dto.PublicBookingResponse;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BookingService {

    private final ProfessionalPublicPageCoreService coreService;
    private final BookingCommandIdempotencyService bookingCommandIdempotencyService;

    public BookingService(
        ProfessionalPublicPageCoreService coreService,
        BookingCommandIdempotencyService bookingCommandIdempotencyService
    ) {
        this.coreService = coreService;
        this.bookingCommandIdempotencyService = bookingCommandIdempotencyService;
    }

    public PublicBookingResponse createPublicBooking(String slug, PublicBookingRequest request, String rawUserId) {
        return coreService.createPublicBooking(slug, request, rawUserId);
    }

    public List<ProfessionalBookingResponse> getProfessionalBookings(
        String rawUserId,
        String rawDate,
        String rawDateFrom,
        String rawDateTo
    ) {
        return coreService.getProfessionalBookings(rawUserId, rawDate, rawDateFrom, rawDateTo);
    }

    public ProfessionalBookingResponse createProfessionalBooking(
        String rawUserId,
        ProfessionalBookingCreateRequest request
    ) {
        return coreService.createProfessionalBooking(rawUserId, request);
    }

    public ProfessionalBookingResponse updateProfessionalBooking(
        String rawUserId,
        Long bookingId,
        ProfessionalBookingUpdateRequest request
    ) {
        return coreService.updateProfessionalBooking(rawUserId, bookingId, request);
    }

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
            () -> coreService.cancelBookingAsClient(rawUserId, bookingId, request)
        );
    }

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
            () -> coreService.rescheduleBookingAsClient(rawUserId, bookingId, request)
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
            () -> coreService.cancelBookingAsProfessional(rawUserId, bookingId, request)
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
            () -> coreService.rescheduleBookingAsProfessional(rawUserId, bookingId, request)
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
            () -> coreService.markBookingNoShow(rawUserId, bookingId)
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
            () -> coreService.completeBooking(rawUserId, bookingId)
        );
    }

    public BookingCommandResponse retryBookingPayout(
        String rawUserId,
        Long bookingId,
        String idempotencyKey
    ) {
        Long actorUserId = parseUserId(rawUserId);
        return bookingCommandIdempotencyService.execute(
            BookingActionType.RETRY_PAYOUT,
            BookingActorType.PROFESSIONAL,
            actorUserId,
            bookingId,
            idempotencyKey,
            null,
            () -> coreService.retryBookingPayout(rawUserId, bookingId)
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
