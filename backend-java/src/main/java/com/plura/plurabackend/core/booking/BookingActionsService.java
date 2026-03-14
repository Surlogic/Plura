package com.plura.plurabackend.core.booking;

import com.plura.plurabackend.core.booking.actions.BookingActionsEvaluation;
import com.plura.plurabackend.core.booking.actions.BookingActionsEvaluator;
import com.plura.plurabackend.core.booking.actions.model.BookingActionActor;
import com.plura.plurabackend.core.booking.actions.model.BookingActionReasonCode;
import com.plura.plurabackend.core.booking.dto.BookingPolicySnapshotResponse;
import com.plura.plurabackend.core.booking.dto.BookingActionsResponse;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.policy.BookingPolicySnapshotService;
import com.plura.plurabackend.core.booking.policy.ResolvedBookingPolicy;
import com.plura.plurabackend.core.booking.repository.BookingRepository;
import com.plura.plurabackend.core.booking.time.BookingDateTimeService;
import com.plura.plurabackend.core.security.CurrentActorService;
import com.plura.plurabackend.core.user.model.UserRole;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BookingActionsService {

    private final BookingRepository bookingRepository;
    private final ProfessionalActorLookupGateway professionalActorLookupGateway;
    private final BookingPolicySnapshotService bookingPolicySnapshotService;
    private final BookingActionsEvaluator bookingActionsEvaluator;
    private final BookingDateTimeService bookingDateTimeService;
    private final CurrentActorService currentActorService;

    public BookingActionsService(
        BookingRepository bookingRepository,
        ProfessionalActorLookupGateway professionalActorLookupGateway,
        BookingPolicySnapshotService bookingPolicySnapshotService,
        BookingActionsEvaluator bookingActionsEvaluator,
        BookingDateTimeService bookingDateTimeService,
        CurrentActorService currentActorService
    ) {
        this.bookingRepository = bookingRepository;
        this.professionalActorLookupGateway = professionalActorLookupGateway;
        this.bookingPolicySnapshotService = bookingPolicySnapshotService;
        this.bookingActionsEvaluator = bookingActionsEvaluator;
        this.bookingDateTimeService = bookingDateTimeService;
        this.currentActorService = currentActorService;
    }

    public BookingActionsResponse getActions(Long bookingId, Authentication authentication) {
        Booking booking = bookingRepository.findDetailedById(bookingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva no encontrada"));

        BookingActionActor actor = resolveActor(authentication, booking);
        ResolvedBookingPolicy resolvedPolicy = bookingPolicySnapshotService.resolveForBooking(booking);

        BookingActionsEvaluation evaluation = bookingActionsEvaluator.evaluate(
            booking,
            actor,
            resolvedPolicy.snapshot(),
            LocalDateTime.now(bookingDateTimeService.resolveZoneId(booking.getTimezone()))
        );

        List<String> reasonCodes = evaluation.reasonCodes().stream()
            .map(BookingActionReasonCode::name)
            .toList();

        if (resolvedPolicy.source() == ResolvedBookingPolicy.PolicySnapshotSource.LIVE_FALLBACK
            && !reasonCodes.contains(BookingActionReasonCode.POLICY_SNAPSHOT_FALLBACK.name())) {
            reasonCodes = new java.util.ArrayList<>(reasonCodes);
            reasonCodes.add(BookingActionReasonCode.POLICY_SNAPSHOT_FALLBACK.name());
        }
        BookingPolicySnapshotResponse policySnapshot = bookingPolicySnapshotService.toResponse(resolvedPolicy);

        return new BookingActionsResponse(
            booking.getId(),
            actor.actorType().name(),
            booking.getOperationalStatus().name(),
            resolvedPolicy.source().name(),
            policySnapshot,
            evaluation.canCancel(),
            evaluation.canReschedule(),
            evaluation.canMarkNoShow(),
            evaluation.refundPreviewAmount(),
            evaluation.retainPreviewAmount(),
            evaluation.currency(),
            evaluation.suggestedAction().name(),
            reasonCodes,
            evaluation.messageCode(),
            evaluation.messageParams(),
            evaluation.plainTextFallback()
        );
    }

    private BookingActionActor resolveActor(Authentication authentication, Booking booking) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No autenticado");
        }

        Long userId = currentActorService.currentUserId();
        UserRole role = currentActorService.currentRole();

        if (role == UserRole.USER) {
            if (booking.getUser() == null || !userId.equals(booking.getUser().getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado");
            }
            return new BookingActionActor(BookingActionActor.BookingActionActorType.CLIENT, userId, null);
        }

        if (role == UserRole.PROFESSIONAL) {
            Long professionalId = professionalActorLookupGateway.findProfessionalIdByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Perfil profesional no encontrado"));
            if (booking.getProfessionalId() == null || !professionalId.equals(booking.getProfessionalId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado");
            }
            return new BookingActionActor(
                BookingActionActor.BookingActionActorType.PROFESSIONAL,
                userId,
                professionalId
            );
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Rol no soportado");
    }
}
