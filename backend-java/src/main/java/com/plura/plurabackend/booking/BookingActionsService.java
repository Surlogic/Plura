package com.plura.plurabackend.booking;

import com.plura.plurabackend.booking.actions.BookingActionsEvaluation;
import com.plura.plurabackend.booking.actions.BookingActionsEvaluator;
import com.plura.plurabackend.booking.actions.model.BookingActionActor;
import com.plura.plurabackend.booking.actions.model.BookingActionReasonCode;
import com.plura.plurabackend.booking.dto.BookingActionsResponse;
import com.plura.plurabackend.booking.model.Booking;
import com.plura.plurabackend.booking.policy.BookingPolicySnapshotService;
import com.plura.plurabackend.booking.policy.ResolvedBookingPolicy;
import com.plura.plurabackend.booking.repository.BookingRepository;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BookingActionsService {

    private final BookingRepository bookingRepository;
    private final ProfessionalProfileRepository professionalProfileRepository;
    private final BookingPolicySnapshotService bookingPolicySnapshotService;
    private final BookingActionsEvaluator bookingActionsEvaluator;
    private final ZoneId appZoneId;

    public BookingActionsService(
        BookingRepository bookingRepository,
        ProfessionalProfileRepository professionalProfileRepository,
        BookingPolicySnapshotService bookingPolicySnapshotService,
        BookingActionsEvaluator bookingActionsEvaluator,
        @Value("${app.timezone:America/Montevideo}") String appTimezone
    ) {
        this.bookingRepository = bookingRepository;
        this.professionalProfileRepository = professionalProfileRepository;
        this.bookingPolicySnapshotService = bookingPolicySnapshotService;
        this.bookingActionsEvaluator = bookingActionsEvaluator;
        this.appZoneId = ZoneId.of(appTimezone);
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
            LocalDateTime.now(appZoneId)
        );

        List<String> reasonCodes = evaluation.reasonCodes().stream()
            .map(BookingActionReasonCode::name)
            .toList();

        if (resolvedPolicy.source() == ResolvedBookingPolicy.PolicySnapshotSource.LIVE_FALLBACK
            && !reasonCodes.contains(BookingActionReasonCode.POLICY_SNAPSHOT_FALLBACK.name())) {
            reasonCodes = new java.util.ArrayList<>(reasonCodes);
            reasonCodes.add(BookingActionReasonCode.POLICY_SNAPSHOT_FALLBACK.name());
        }

        return new BookingActionsResponse(
            booking.getId(),
            actor.actorType().name(),
            booking.getOperationalStatus().name(),
            resolvedPolicy.source().name(),
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

        Long userId = parseUserId(authentication.getPrincipal().toString());

        boolean isClient = authentication.getAuthorities().stream()
            .anyMatch(auth -> "ROLE_USER".equals(auth.getAuthority()));
        if (isClient) {
            if (booking.getUser() == null || !userId.equals(booking.getUser().getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado");
            }
            return new BookingActionActor(BookingActionActor.BookingActionActorType.CLIENT, userId, null);
        }

        boolean isProfessional = authentication.getAuthorities().stream()
            .anyMatch(auth -> "ROLE_PROFESSIONAL".equals(auth.getAuthority()));
        if (isProfessional) {
            Long professionalId = professionalProfileRepository.findByUser_Id(userId)
                .map(profile -> profile.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Perfil profesional no encontrado"));
            if (booking.getProfessional() == null || !professionalId.equals(booking.getProfessional().getId())) {
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

    private Long parseUserId(String rawUserId) {
        try {
            return Long.parseLong(rawUserId.trim());
        } catch (NumberFormatException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token inválido");
        }
    }
}
