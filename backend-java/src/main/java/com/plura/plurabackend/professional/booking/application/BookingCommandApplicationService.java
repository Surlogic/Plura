package com.plura.plurabackend.professional.booking.application;

import com.plura.plurabackend.core.booking.actions.BookingActionsEvaluation;
import com.plura.plurabackend.core.booking.actions.BookingActionsEvaluator;
import com.plura.plurabackend.core.booking.actions.model.BookingActionActor;
import com.plura.plurabackend.core.booking.actions.model.BookingActionReasonCode;
import com.plura.plurabackend.core.booking.decision.BookingActionDecisionService;
import com.plura.plurabackend.core.booking.decision.model.BookingActionDecision;
import com.plura.plurabackend.core.booking.decision.model.BookingActionType;
import com.plura.plurabackend.core.booking.dto.BookingCancelRequest;
import com.plura.plurabackend.core.booking.dto.BookingCommandResponse;
import com.plura.plurabackend.core.booking.dto.BookingRescheduleRequest;
import com.plura.plurabackend.core.booking.dto.ProfessionalBookingCreateRequest;
import com.plura.plurabackend.core.booking.dto.ProfessionalBookingResponse;
import com.plura.plurabackend.core.booking.dto.ProfessionalBookingUpdateRequest;
import com.plura.plurabackend.core.booking.dto.PublicBookingRequest;
import com.plura.plurabackend.core.booking.dto.PublicBookingResponse;
import com.plura.plurabackend.core.booking.event.BookingEventService;
import com.plura.plurabackend.core.booking.event.model.BookingActorType;
import com.plura.plurabackend.core.booking.event.model.BookingEventType;
import com.plura.plurabackend.core.booking.BookingCommandResponseAssembler;
import com.plura.plurabackend.core.booking.BookingCommandStateSupport;
import com.plura.plurabackend.core.booking.BookingFinancialCommandSupport;
import com.plura.plurabackend.core.booking.BookingSchedulingAvailabilityGateway;
import com.plura.plurabackend.core.booking.finance.BookingFinanceService;
import com.plura.plurabackend.core.booking.finance.BookingFinanceDispatchPlan;
import com.plura.plurabackend.core.booking.finance.BookingFinanceUpdateResult;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.core.booking.model.ServicePaymentType;
import com.plura.plurabackend.core.notification.integration.booking.BookingNotificationIntegrationService;
import com.plura.plurabackend.core.booking.policy.BookingPolicySnapshotService;
import com.plura.plurabackend.core.booking.policy.ResolvedBookingPolicy;
import com.plura.plurabackend.core.booking.repository.BookingRepository;
import com.plura.plurabackend.core.booking.time.BookingDateTimeService;
import com.plura.plurabackend.professional.application.ProfessionalAccessSupport;
import com.plura.plurabackend.professional.application.ProfessionalSideEffectCoordinator;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import com.plura.plurabackend.professional.service.model.ProfesionalService;
import com.plura.plurabackend.professional.service.repository.ProfesionalServiceRepository;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.model.UserRole;
import com.plura.plurabackend.core.user.repository.UserRepository;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BookingCommandApplicationService {

    private final ProfessionalProfileRepository professionalProfileRepository;
    private final ProfesionalServiceRepository profesionalServiceRepository;
    private final BookingRepository bookingRepository;
    private final BookingPolicySnapshotService bookingPolicySnapshotService;
    private final BookingActionsEvaluator bookingActionsEvaluator;
    private final BookingActionDecisionService bookingActionDecisionService;
    private final BookingFinanceService bookingFinanceService;
    private final BookingSchedulingAvailabilityGateway bookingSchedulingAvailabilityGateway;
    private final BookingEventService bookingEventService;
    private final UserRepository userRepository;
    private final BookingDateTimeService bookingDateTimeService;
    private final ProfessionalAccessSupport professionalAccessSupport;
    private final ProfessionalSideEffectCoordinator sideEffectCoordinator;
    private final BookingFinancialCommandSupport bookingFinancialCommandSupport;
    private final BookingCommandResponseAssembler bookingCommandResponseAssembler;
    private final BookingCommandStateSupport bookingCommandStateSupport;
    private final BookingNotificationIntegrationService bookingNotificationIntegrationService;
    private final MeterRegistry meterRegistry;
    private final PasswordEncoder passwordEncoder;
    private final ZoneId systemZoneId;

    public BookingCommandApplicationService(
        ProfessionalProfileRepository professionalProfileRepository,
        ProfesionalServiceRepository profesionalServiceRepository,
        BookingRepository bookingRepository,
        BookingPolicySnapshotService bookingPolicySnapshotService,
        BookingActionsEvaluator bookingActionsEvaluator,
        BookingActionDecisionService bookingActionDecisionService,
        BookingFinanceService bookingFinanceService,
        BookingSchedulingAvailabilityGateway bookingSchedulingAvailabilityGateway,
        BookingEventService bookingEventService,
        UserRepository userRepository,
        BookingDateTimeService bookingDateTimeService,
        ProfessionalAccessSupport professionalAccessSupport,
        ProfessionalSideEffectCoordinator sideEffectCoordinator,
        BookingFinancialCommandSupport bookingFinancialCommandSupport,
        BookingCommandResponseAssembler bookingCommandResponseAssembler,
        BookingCommandStateSupport bookingCommandStateSupport,
        BookingNotificationIntegrationService bookingNotificationIntegrationService,
        MeterRegistry meterRegistry,
        PasswordEncoder passwordEncoder,
        @Value("${app.timezone:America/Montevideo}") String appTimezone
    ) {
        this.professionalProfileRepository = professionalProfileRepository;
        this.profesionalServiceRepository = profesionalServiceRepository;
        this.bookingRepository = bookingRepository;
        this.bookingPolicySnapshotService = bookingPolicySnapshotService;
        this.bookingActionsEvaluator = bookingActionsEvaluator;
        this.bookingActionDecisionService = bookingActionDecisionService;
        this.bookingFinanceService = bookingFinanceService;
        this.bookingSchedulingAvailabilityGateway = bookingSchedulingAvailabilityGateway;
        this.bookingEventService = bookingEventService;
        this.userRepository = userRepository;
        this.bookingDateTimeService = bookingDateTimeService;
        this.professionalAccessSupport = professionalAccessSupport;
        this.sideEffectCoordinator = sideEffectCoordinator;
        this.bookingFinancialCommandSupport = bookingFinancialCommandSupport;
        this.bookingCommandResponseAssembler = bookingCommandResponseAssembler;
        this.bookingCommandStateSupport = bookingCommandStateSupport;
        this.bookingNotificationIntegrationService = bookingNotificationIntegrationService;
        this.meterRegistry = meterRegistry;
        this.passwordEncoder = passwordEncoder;
        this.systemZoneId = ZoneId.of(appTimezone);
    }

    @Transactional
    public PublicBookingResponse createPublicBooking(
        String slug,
        PublicBookingRequest request,
        String rawUserId
    ) {
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            User user = professionalAccessSupport.loadActiveUser(rawUserId, "Usuario no encontrado");
            if (user.getRole() != UserRole.USER) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo clientes pueden reservar");
            }

            ProfessionalProfile profile = professionalProfileRepository.findBySlugForUpdate(slug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profesional no encontrado"));
            professionalAccessSupport.ensureProfessionalReservable(profile);

            ProfesionalService service = profesionalServiceRepository.findById(request.getServiceId().trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Servicio no encontrado"));
            if (service.getProfessional() == null || !service.getProfessional().getId().equals(profile.getId())) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Servicio no encontrado");
            }
            professionalAccessSupport.ensureServiceReservable(service);

            var resolvedStart = bookingDateTimeService.parseBookingStart(request.getStartDateTime(), systemZoneId.getId());
            LocalDateTime startDateTime = resolvedStart.localDateTime();
            if (startDateTime.getSecond() != 0 || startDateTime.getNano() != 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El slot debe venir en minutos exactos");
            }
            LocalDateTime now = nowInSystemZone();
            if (!startDateTime.isAfter(now)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La fecha de reserva debe ser futura");
            }
            if (!bookingSchedulingAvailabilityGateway.isSlotAvailable(profile.getId(), service.getId(), startDateTime, null)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "El horario seleccionado no está disponible");
            }

            Booking booking = new Booking();
            booking.setUser(user);
            booking.setProfessionalId(profile.getId());
            booking.setServiceId(service.getId());
            booking.setStartDateTime(startDateTime);
            booking.setStartDateTimeUtc(resolvedStart.utcInstant());
            booking.setTimezone(resolvedStart.timezone());
            booking.applyOperationalStatus(BookingOperationalStatus.PENDING, now);
            booking.setCreatedAt(now);
            captureServiceSnapshot(booking, service);
            bookingPolicySnapshotService.applySnapshot(
                booking,
                bookingPolicySnapshotService.buildForProfessionalId(profile.getId())
            );
            Booking saved = bookingRepository.saveAndFlush(booking);
            bookingFinanceService.ensureInitialized(saved);
            bookingEventService.record(
                saved,
                BookingEventType.BOOKING_CREATED,
                BookingActorType.CLIENT,
                user.getId(),
                Map.of(
                    "operationalStatus", saved.getOperationalStatus().name(),
                    "timezone", saved.getTimezone(),
                    "servicePaymentType", saved.getServicePaymentTypeSnapshot().name()
                )
            );
            if (saved.getServicePaymentTypeSnapshot() == ServicePaymentType.ON_SITE) {
                bookingNotificationIntegrationService.recordBookingCreated(
                    saved,
                    BookingActorType.CLIENT,
                    user.getId(),
                    "create_public_booking"
                );
            }
            triggerBookingSideEffectsAfterCommit(profile, Set.of(startDateTime.toLocalDate()));

            return new PublicBookingResponse(
                saved.getId(),
                saved.getOperationalStatus().name(),
                saved.getStartDateTime().toString(),
                saved.getTimezone(),
                saved.getServiceId(),
                String.valueOf(saved.getProfessionalId()),
                String.valueOf(saved.getUser().getId())
            );
        } finally {
            sample.stop(
                Timer.builder("plura.booking.creation.time")
                    .description("Booking creation execution time")
                    .register(meterRegistry)
            );
        }
    }

    @Transactional
    public ProfessionalBookingResponse createProfessionalBooking(
        String rawUserId,
        ProfessionalBookingCreateRequest request
    ) {
        ProfessionalProfile profile = professionalAccessSupport.loadProfessionalByUserId(rawUserId);
        professionalAccessSupport.ensureProfessionalReservable(profile);
        professionalAccessSupport.ensureSlug(profile);
        if (profile.getSlug() == null || profile.getSlug().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No se pudo generar el slug del profesional");
        }

        Long clientUserId = resolveOrCreateManualClient(request);
        PublicBookingRequest bookingRequest = new PublicBookingRequest();
        bookingRequest.setServiceId(request.getServiceId().trim());
        bookingRequest.setStartDateTime(request.getStartDateTime().trim());

        PublicBookingResponse created = createPublicBooking(profile.getSlug(), bookingRequest, String.valueOf(clientUserId));
        Booking booking = bookingRepository.findById(created.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva no encontrada"));

        if (booking.getOperationalStatus() == BookingOperationalStatus.PENDING) {
            booking.applyOperationalStatus(BookingOperationalStatus.CONFIRMED, nowInSystemZone());
            booking = bookingRepository.save(booking);
            bookingEventService.record(
                booking,
                BookingEventType.BOOKING_CONFIRMED,
                BookingActorType.PROFESSIONAL,
                profile.getUser().getId(),
                Map.of("source", "manual_professional_booking")
            );
            bookingNotificationIntegrationService.recordBookingConfirmed(
                booking,
                BookingActorType.PROFESSIONAL,
                profile.getUser().getId(),
                "create_professional_booking"
            );
        }

        return bookingCommandResponseAssembler.toProfessionalBookingResponse(booking);
    }

    @Transactional
    public ProfessionalBookingResponse updateProfessionalBooking(
        String rawUserId,
        Long bookingId,
        ProfessionalBookingUpdateRequest request
    ) {
        if (request != null && request.getStatus() != null) {
            return switch (request.getStatus()) {
                case CANCELLED -> cancelBookingAsProfessional(rawUserId, bookingId, null).getBooking();
                case NO_SHOW -> markBookingNoShow(rawUserId, bookingId).getBooking();
                case COMPLETED -> completeBooking(rawUserId, bookingId).getBooking();
                case PENDING, CONFIRMED -> updateBookingStatusAsProfessional(rawUserId, bookingId, request);
            };
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payload inválido");
    }

    @Transactional
    public BookingCommandResponse cancelBookingAsClient(
        String rawUserId,
        Long bookingId,
        BookingCancelRequest request
    ) {
        User client = professionalAccessSupport.loadClientByUserId(rawUserId);
        LocalDateTime now = nowInSystemZone();
        Booking booking = bookingRepository.findDetailedByIdForUpdate(bookingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva no encontrada"));
        bookingCommandStateSupport.ensureClientOwnsBooking(client.getId(), booking);

        BookingActionActor actor = new BookingActionActor(
            BookingActionActor.BookingActionActorType.CLIENT,
            client.getId(),
            null
        );
        EvaluatedBookingAction evaluated = evaluateBookingAction(booking, actor, now);
        bookingCommandStateSupport.requireAllowedAction(evaluated.evaluation().canCancel(), evaluated.evaluation());

        BookingOperationalStatus previousStatus = booking.getOperationalStatus();
        booking.applyOperationalStatus(BookingOperationalStatus.CANCELLED, now);
        Booking saved = bookingRepository.saveAndFlush(booking);

        BookingActionDecision decision = bookingActionDecisionService.record(
            saved,
            BookingActionType.CANCEL,
            BookingActorType.CLIENT,
            client.getId(),
            previousStatus,
            saved.getOperationalStatus(),
            evaluated.evaluation(),
            buildCancellationDecisionSnapshot(saved, evaluated.resolvedPolicy(), request)
        );
        BookingFinanceDispatchPlan financePlan = bookingFinancialCommandSupport.processDecision(saved, decision);

        bookingEventService.record(
            saved,
            BookingEventType.BOOKING_CANCELLED,
            BookingActorType.CLIENT,
            client.getId(),
            buildCancellationEventPayload(saved, previousStatus, decision, request)
        );
        bookingNotificationIntegrationService.recordBookingCancelled(
            saved,
            BookingActorType.CLIENT,
            client.getId(),
            "cancel_booking_as_client"
        );

        triggerBookingSideEffectsAfterCommit(loadProfessionalForBooking(saved), Set.of(saved.getStartDateTime().toLocalDate()));
        BookingCommandResponse response = bookingCommandResponseAssembler.toCommandResponse(saved, decision, financePlan.localResult());
        bookingFinancialCommandSupport.dispatchPlannedOperationsAfterCommit(saved, financePlan);
        return response;
    }

    @Transactional
    public BookingCommandResponse cancelBookingAsProfessional(
        String rawUserId,
        Long bookingId,
        BookingCancelRequest request
    ) {
        ProfessionalProfile profile = professionalAccessSupport.loadProfessionalByUserId(rawUserId);
        LocalDateTime now = nowInSystemZone();
        Booking booking = bookingRepository.findDetailedByIdForUpdate(bookingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva no encontrada"));
        bookingCommandStateSupport.ensureProfessionalOwnsBooking(profile.getId(), booking);

        BookingActionActor actor = new BookingActionActor(
            BookingActionActor.BookingActionActorType.PROFESSIONAL,
            profile.getUser().getId(),
            profile.getId()
        );
        EvaluatedBookingAction evaluated = evaluateBookingAction(booking, actor, now);
        bookingCommandStateSupport.requireAllowedAction(evaluated.evaluation().canCancel(), evaluated.evaluation());

        BookingOperationalStatus previousStatus = booking.getOperationalStatus();
        booking.applyOperationalStatus(BookingOperationalStatus.CANCELLED, now);
        Booking saved = bookingRepository.saveAndFlush(booking);

        BookingActionDecision decision = bookingActionDecisionService.record(
            saved,
            BookingActionType.CANCEL,
            BookingActorType.PROFESSIONAL,
            profile.getUser().getId(),
            previousStatus,
            saved.getOperationalStatus(),
            evaluated.evaluation(),
            buildCancellationDecisionSnapshot(saved, evaluated.resolvedPolicy(), request)
        );
        BookingFinanceDispatchPlan financePlan = bookingFinancialCommandSupport.processDecision(saved, decision);

        bookingEventService.record(
            saved,
            BookingEventType.BOOKING_CANCELLED,
            BookingActorType.PROFESSIONAL,
            profile.getUser().getId(),
            buildCancellationEventPayload(saved, previousStatus, decision, request)
        );
        bookingNotificationIntegrationService.recordBookingCancelled(
            saved,
            BookingActorType.PROFESSIONAL,
            profile.getUser().getId(),
            "cancel_booking_as_professional"
        );

        triggerBookingSideEffectsAfterCommit(profile, Set.of(saved.getStartDateTime().toLocalDate()));
        BookingCommandResponse response = bookingCommandResponseAssembler.toCommandResponse(saved, decision, financePlan.localResult());
        bookingFinancialCommandSupport.dispatchPlannedOperationsAfterCommit(saved, financePlan);
        return response;
    }

    @Transactional
    public BookingCommandResponse rescheduleBookingAsClient(
        String rawUserId,
        Long bookingId,
        BookingRescheduleRequest request
    ) {
        User client = professionalAccessSupport.loadClientByUserId(rawUserId);
        LocalDateTime now = nowInSystemZone();
        Booking booking = bookingRepository.findDetailedByIdForUpdate(bookingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva no encontrada"));
        bookingCommandStateSupport.ensureClientOwnsBooking(client.getId(), booking);

        BookingActionActor actor = new BookingActionActor(
            BookingActionActor.BookingActionActorType.CLIENT,
            client.getId(),
            null
        );
        EvaluatedBookingAction evaluated = evaluateBookingAction(booking, actor, now);
        bookingCommandStateSupport.requireAllowedAction(evaluated.evaluation().canReschedule(), evaluated.evaluation());

        return performReschedule(booking, request, now, BookingActorType.CLIENT, client.getId(), evaluated);
    }

    @Transactional
    public BookingCommandResponse rescheduleBookingAsProfessional(
        String rawUserId,
        Long bookingId,
        BookingRescheduleRequest request
    ) {
        ProfessionalProfile profile = professionalAccessSupport.loadProfessionalByUserId(rawUserId);
        LocalDateTime now = nowInSystemZone();
        Booking booking = bookingRepository.findDetailedByIdForUpdate(bookingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva no encontrada"));
        bookingCommandStateSupport.ensureProfessionalOwnsBooking(profile.getId(), booking);

        BookingActionActor actor = new BookingActionActor(
            BookingActionActor.BookingActionActorType.PROFESSIONAL,
            profile.getUser().getId(),
            profile.getId()
        );
        EvaluatedBookingAction evaluated = evaluateBookingAction(booking, actor, now);
        bookingCommandStateSupport.requireAllowedAction(evaluated.evaluation().canReschedule(), evaluated.evaluation());

        return performReschedule(booking, request, now, BookingActorType.PROFESSIONAL, profile.getUser().getId(), evaluated);
    }

    @Transactional
    public BookingCommandResponse markBookingNoShow(String rawUserId, Long bookingId) {
        ProfessionalProfile profile = professionalAccessSupport.loadProfessionalByUserId(rawUserId);
        LocalDateTime now = nowInSystemZone();
        Booking booking = bookingRepository.findDetailedByIdForUpdate(bookingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva no encontrada"));
        bookingCommandStateSupport.ensureProfessionalOwnsBooking(profile.getId(), booking);

        BookingActionActor actor = new BookingActionActor(
            BookingActionActor.BookingActionActorType.PROFESSIONAL,
            profile.getUser().getId(),
            profile.getId()
        );
        EvaluatedBookingAction evaluated = evaluateBookingAction(booking, actor, now);
        if (!evaluated.evaluation().canMarkNoShow()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, evaluated.evaluation().plainTextFallback());
        }

        BookingOperationalStatus previousStatus = booking.getOperationalStatus();
        booking.applyOperationalStatus(BookingOperationalStatus.NO_SHOW, now);
        Booking saved = bookingRepository.saveAndFlush(booking);

        BookingActionDecision decision = bookingActionDecisionService.recordManual(
            saved,
            BookingActionType.NO_SHOW,
            BookingActorType.PROFESSIONAL,
            profile.getUser().getId(),
            previousStatus,
            saved.getOperationalStatus(),
            evaluated.evaluation().refundPreviewAmount(),
            evaluated.evaluation().retainPreviewAmount(),
            evaluated.evaluation().currency(),
            List.of(BookingActionReasonCode.NO_SHOW_MARKED_MANUALLY.name()),
            "booking.actions.no_show_marked",
            Map.of("bookingId", String.valueOf(saved.getId())),
            "La reserva fue marcada manualmente como no-show.",
            evaluated.evaluation().retainPreviewAmount() != null
                && evaluated.evaluation().retainPreviewAmount().signum() > 0
                    ? "RETENTION_RECORDED"
                    : "NO_FINANCIAL_ACTION",
            Map.of(
                "policySource", evaluated.resolvedPolicy().source().name(),
                "markedAt", now.toString()
            )
        );
        BookingFinanceDispatchPlan financePlan = bookingFinancialCommandSupport.processDecision(saved, decision);

        bookingEventService.record(
            saved,
            BookingEventType.BOOKING_NO_SHOW_MARKED,
            BookingActorType.PROFESSIONAL,
            profile.getUser().getId(),
            Map.of(
                "previousStatus", previousStatus.name(),
                "nextStatus", saved.getOperationalStatus().name(),
                "decisionId", decision.getId()
            )
        );
        bookingNotificationIntegrationService.recordBookingNoShow(
            saved,
            BookingActorType.PROFESSIONAL,
            profile.getUser().getId(),
            "mark_booking_no_show"
        );

        BookingCommandResponse response = bookingCommandResponseAssembler.toCommandResponse(saved, decision, financePlan.localResult());
        bookingFinancialCommandSupport.dispatchPlannedOperationsAfterCommit(saved, financePlan);
        return response;
    }

    @Transactional
    public BookingCommandResponse completeBooking(String rawUserId, Long bookingId) {
        ProfessionalProfile profile = professionalAccessSupport.loadProfessionalByUserId(rawUserId);
        LocalDateTime now = nowInSystemZone();
        Booking booking = bookingRepository.findDetailedByIdForUpdate(bookingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva no encontrada"));
        bookingCommandStateSupport.ensureProfessionalOwnsBooking(profile.getId(), booking);

        if (booking.getOperationalStatus() != BookingOperationalStatus.CONFIRMED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La reserva no puede completarse en su estado actual");
        }
        Instant bookingEndInstant = bookingDateTimeService.resolveEndInstant(booking);
        Instant nowInstant = now.atZone(systemZoneId).toInstant();
        if (bookingEndInstant != null && bookingEndInstant.isAfter(nowInstant)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La reserva solo puede completarse después de que termine el turno");
        }
        LocalDateTime bookingEndDateTime = bookingDateTimeService.resolveEndDateTime(booking);
        if (bookingEndInstant == null && bookingEndDateTime != null && bookingEndDateTime.isAfter(now)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La reserva solo puede completarse después de que termine el turno");
        }

        BookingOperationalStatus previousStatus = booking.getOperationalStatus();
        booking.applyOperationalStatus(BookingOperationalStatus.COMPLETED, now);
        Booking saved = bookingRepository.saveAndFlush(booking);

        BookingActionDecision decision = bookingActionDecisionService.recordManual(
            saved,
            BookingActionType.COMPLETE,
            BookingActorType.PROFESSIONAL,
            profile.getUser().getId(),
            previousStatus,
            saved.getOperationalStatus(),
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            "UYU",
            List.of(BookingActionReasonCode.BOOKING_COMPLETED_MANUALLY.name()),
            "booking.actions.booking_completed",
            Map.of("bookingId", String.valueOf(saved.getId())),
            "La reserva fue marcada como completada.",
            "NO_FINANCIAL_ACTION",
            Map.of("completedAt", now.toString())
        );
        BookingFinanceDispatchPlan financePlan = bookingFinancialCommandSupport.processDecision(saved, decision);

        bookingEventService.record(
            saved,
            BookingEventType.BOOKING_COMPLETED,
            BookingActorType.PROFESSIONAL,
            profile.getUser().getId(),
            Map.of(
                "previousStatus", previousStatus.name(),
                "nextStatus", saved.getOperationalStatus().name(),
                "decisionId", decision.getId()
            )
        );
        bookingNotificationIntegrationService.recordBookingCompleted(
            saved,
            BookingActorType.PROFESSIONAL,
            profile.getUser().getId(),
            "complete_booking"
        );

        BookingCommandResponse response = bookingCommandResponseAssembler.toCommandResponse(saved, decision, financePlan.localResult());
        bookingFinancialCommandSupport.dispatchPlannedOperationsAfterCommit(saved, financePlan);
        return response;
    }

    private ProfessionalBookingResponse updateBookingStatusAsProfessional(
        String rawUserId,
        Long bookingId,
        ProfessionalBookingUpdateRequest request
    ) {
        ProfessionalProfile profile = professionalAccessSupport.loadProfessionalByUserId(rawUserId);
        Booking booking = bookingRepository.findById(bookingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva no encontrada"));
        bookingCommandStateSupport.ensureProfessionalOwnsBooking(profile.getId(), booking);

        BookingOperationalStatus previousStatus = booking.getOperationalStatus();
        bookingCommandStateSupport.validateBookingStatusTransition(previousStatus, request.getStatus());
        booking.applyOperationalStatus(request.getStatus(), nowInSystemZone());
        Booking saved = bookingRepository.save(booking);
        recordOperationalStatusEvent(saved, previousStatus, profile.getUser().getId());
        triggerBookingSideEffectsAfterCommit(profile, Set.of(saved.getStartDateTime().toLocalDate()));
        return bookingCommandResponseAssembler.toProfessionalBookingResponse(saved);
    }

    private BookingCommandResponse performReschedule(
        Booking booking,
        BookingRescheduleRequest request,
        LocalDateTime now,
        BookingActorType actorType,
        Long actorUserId,
        EvaluatedBookingAction evaluated
    ) {
        if (request == null || request.getStartDateTime() == null || request.getStartDateTime().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nuevo horario es obligatorio");
        }

        ProfessionalProfile lockedProfessional = professionalProfileRepository.findByIdForUpdate(booking.getProfessionalId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profesional no encontrado"));

        String nextTimezone = bookingCommandStateSupport.resolveBookingTimezoneForReschedule(
            booking,
            request,
            systemZoneId.getId()
        );
        var resolvedStart = bookingDateTimeService.parseBookingStart(request.getStartDateTime(), nextTimezone);
        LocalDateTime nextStartDateTime = resolvedStart.localDateTime();
        if (nextStartDateTime.equals(booking.getStartDateTime())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nuevo horario debe ser distinto al actual");
        }
        if (!nextStartDateTime.isAfter(now)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La nueva fecha debe ser futura");
        }
        if (
            !bookingSchedulingAvailabilityGateway.isSlotAvailable(
                lockedProfessional.getId(),
                booking.getServiceId(),
                nextStartDateTime,
                booking.getId()
            )
        ) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El nuevo horario ya no está disponible");
        }

        LocalDate previousDate = booking.getStartDateTime().toLocalDate();
        LocalDate nextDate = nextStartDateTime.toLocalDate();
        BookingOperationalStatus previousStatus = booking.getOperationalStatus();
        LocalDateTime previousStartDateTime = booking.getStartDateTime();
        String previousTimezone = booking.getTimezone();
        Integer previousRescheduleCount = booking.getRescheduleCount() == null ? 0 : booking.getRescheduleCount();

        booking.setStartDateTime(nextStartDateTime);
        booking.setStartDateTimeUtc(resolvedStart.utcInstant());
        booking.setTimezone(resolvedStart.timezone());
        booking.setRescheduleCount(previousRescheduleCount + 1);
        Booking saved = bookingRepository.saveAndFlush(booking);

        BookingActionDecision decision = bookingActionDecisionService.record(
            saved,
            BookingActionType.RESCHEDULE,
            actorType,
            actorUserId,
            previousStatus,
            saved.getOperationalStatus(),
            evaluated.evaluation(),
            buildRescheduleDecisionSnapshot(
                evaluated.resolvedPolicy(),
                previousStartDateTime,
                nextStartDateTime,
                previousTimezone,
                nextTimezone,
                previousRescheduleCount,
                saved.getRescheduleCount()
            )
        );
        BookingFinanceDispatchPlan financePlan = bookingFinancialCommandSupport.processDecision(saved, decision);

        bookingEventService.record(
            saved,
            BookingEventType.BOOKING_RESCHEDULED,
            actorType,
            actorUserId,
            Map.of(
                "previousStartDateTime", previousStartDateTime.toString(),
                "nextStartDateTime", nextStartDateTime.toString(),
                "previousTimezone", previousTimezone,
                "nextTimezone", nextTimezone,
                "rescheduleCountBefore", previousRescheduleCount,
                "rescheduleCountAfter", saved.getRescheduleCount(),
                "decisionId", decision.getId()
            )
        );
        bookingNotificationIntegrationService.recordBookingRescheduled(
            saved,
            actorType,
            actorUserId,
            "reschedule_booking"
        );

        triggerBookingSideEffectsAfterCommit(
            lockedProfessional,
            bookingCommandStateSupport.buildAffectedDates(previousDate, nextDate)
        );
        BookingCommandResponse response = bookingCommandResponseAssembler.toCommandResponse(saved, decision, financePlan.localResult());
        bookingFinancialCommandSupport.dispatchPlannedOperationsAfterCommit(saved, financePlan);
        return response;
    }

    private EvaluatedBookingAction evaluateBookingAction(
        Booking booking,
        BookingActionActor actor,
        LocalDateTime now
    ) {
        ResolvedBookingPolicy resolvedPolicy = bookingPolicySnapshotService.resolveForBooking(booking);
        BookingActionsEvaluation rawEvaluation = bookingActionsEvaluator.evaluate(
            booking,
            actor,
            resolvedPolicy.snapshot(),
            now
        );

        if (resolvedPolicy.source() != ResolvedBookingPolicy.PolicySnapshotSource.LIVE_FALLBACK
            || rawEvaluation.reasonCodes().contains(BookingActionReasonCode.POLICY_SNAPSHOT_FALLBACK)) {
            return new EvaluatedBookingAction(resolvedPolicy, rawEvaluation);
        }

        List<BookingActionReasonCode> reasonCodes = new ArrayList<>(rawEvaluation.reasonCodes());
        reasonCodes.add(BookingActionReasonCode.POLICY_SNAPSHOT_FALLBACK);
        BookingActionsEvaluation evaluation = new BookingActionsEvaluation(
            rawEvaluation.canCancel(),
            rawEvaluation.canReschedule(),
            rawEvaluation.canMarkNoShow(),
            rawEvaluation.canComplete(),
            rawEvaluation.refundPreviewAmount(),
            rawEvaluation.retainPreviewAmount(),
            rawEvaluation.currency(),
            rawEvaluation.suggestedAction(),
            List.copyOf(reasonCodes),
            rawEvaluation.messageCode(),
            rawEvaluation.messageParams(),
            rawEvaluation.plainTextFallback()
        );
        return new EvaluatedBookingAction(resolvedPolicy, evaluation);
    }

    private Map<String, Object> buildCancellationDecisionSnapshot(
        Booking booking,
        ResolvedBookingPolicy resolvedPolicy,
        BookingCancelRequest request
    ) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("policySource", resolvedPolicy.source().name());
        snapshot.put("bookingStartDateTime", booking.getStartDateTime().toString());
        snapshot.put("bookingTimezone", booking.getTimezone());
        if (request != null && request.getReason() != null && !request.getReason().isBlank()) {
            snapshot.put("requestReason", request.getReason().trim());
        }
        return snapshot;
    }

    private Map<String, Object> buildCancellationEventPayload(
        Booking booking,
        BookingOperationalStatus previousStatus,
        BookingActionDecision decision,
        BookingCancelRequest request
    ) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("previousStatus", previousStatus.name());
        payload.put("nextStatus", booking.getOperationalStatus().name());
        payload.put("timezone", booking.getTimezone());
        payload.put("decisionId", decision.getId());
        payload.put("financialOutcomeCode", decision.getFinancialOutcomeCode());
        if (request != null && request.getReason() != null && !request.getReason().isBlank()) {
            payload.put("requestReason", request.getReason().trim());
        }
        return payload;
    }

    private Map<String, Object> buildRescheduleDecisionSnapshot(
        ResolvedBookingPolicy resolvedPolicy,
        LocalDateTime previousStartDateTime,
        LocalDateTime nextStartDateTime,
        String previousTimezone,
        String nextTimezone,
        Integer previousRescheduleCount,
        Integer nextRescheduleCount
    ) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("policySource", resolvedPolicy.source().name());
        snapshot.put("previousStartDateTime", previousStartDateTime.toString());
        snapshot.put("nextStartDateTime", nextStartDateTime.toString());
        snapshot.put("previousTimezone", previousTimezone);
        snapshot.put("nextTimezone", nextTimezone);
        snapshot.put("rescheduleCountBefore", previousRescheduleCount);
        snapshot.put("rescheduleCountAfter", nextRescheduleCount);
        return snapshot;
    }

    private LocalDateTime nowInSystemZone() {
        return LocalDateTime.now(systemZoneId);
    }

    private Long resolveOrCreateManualClient(ProfessionalBookingCreateRequest request) {
        String clientName = request.getClientName() == null ? "" : request.getClientName().trim();
        if (clientName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nombre del cliente es obligatorio");
        }

        String clientEmail = normalizeOptional(request.getClientEmail());
        if (clientEmail != null) {
            clientEmail = clientEmail.toLowerCase(Locale.ROOT);
        }
        String clientPhone = normalizeOptional(request.getClientPhone());

        if (clientEmail != null) {
            User existing = userRepository.findByEmailAndDeletedAtIsNull(clientEmail).orElse(null);
            if (existing != null) {
                if (existing.getRole() != UserRole.USER) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El email pertenece a una cuenta no cliente");
                }
                boolean changed = false;
                if (!clientName.equals(existing.getFullName())) {
                    existing.setFullName(clientName);
                    changed = true;
                }
                if (clientPhone != null && !clientPhone.equals(existing.getPhoneNumber())) {
                    existing.setPhoneNumber(clientPhone);
                    changed = true;
                }
                if (changed) {
                    userRepository.save(existing);
                }
                return existing.getId();
            }
        }

        User newUser = new User();
        newUser.setFullName(clientName);
        newUser.setPhoneNumber(clientPhone);
        newUser.setRole(UserRole.USER);
        newUser.setEmail(clientEmail != null ? clientEmail : generateManualClientEmail());
        newUser.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
        return userRepository.save(newUser).getId();
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
    }

    private String generateManualClientEmail() {
        return "manual+" + UUID.randomUUID().toString().replace("-", "") + "@plura.local";
    }

    private void captureServiceSnapshot(Booking booking, ProfesionalService service) {
        booking.setServiceId(service.getId());
        booking.setServiceNameSnapshot(service.getName());
        booking.setServiceDurationSnapshot(service.getDuration());
        booking.setServicePostBufferMinutesSnapshot(resolvePostBufferMinutes(service));
        booking.setServicePaymentTypeSnapshot(resolveServicePaymentType(service.getPaymentType()));
        booking.setServicePriceSnapshot(parsePriceSnapshot(service.getPrice()));
        booking.setServiceDepositAmountSnapshot(service.getDepositAmount());
        booking.setServiceCurrencySnapshot(resolveServiceCurrency(service.getCurrency()));
        if (service.getProfessional() != null) {
            booking.setProfessionalId(service.getProfessional().getId());
            booking.setProfessionalSlugSnapshot(service.getProfessional().getSlug());
            booking.setProfessionalLocationSnapshot(service.getProfessional().getLocation());
            if (service.getProfessional().getUser() != null) {
                booking.setProfessionalDisplayNameSnapshot(service.getProfessional().getUser().getFullName());
            } else {
                booking.setProfessionalDisplayNameSnapshot(service.getProfessional().getDisplayName());
            }
        }
    }

    private int resolvePostBufferMinutes(ProfesionalService service) {
        if (service == null || service.getPostBufferMinutes() == null || service.getPostBufferMinutes() < 0) {
            return 0;
        }
        return service.getPostBufferMinutes();
    }

    private ServicePaymentType resolveServicePaymentType(ServicePaymentType paymentType) {
        return paymentType == null ? ServicePaymentType.ON_SITE : paymentType;
    }

    private String resolveServiceCurrency(String currency) {
        if (currency == null || currency.isBlank()) {
            return "UYU";
        }
        return currency.trim().toUpperCase(Locale.ROOT);
    }

    private BigDecimal parsePriceSnapshot(String price) {
        if (price == null || price.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(price.trim());
        } catch (NumberFormatException exception) {
            return null;
        }
    }


    private void triggerBookingSideEffectsAfterCommit(
        ProfessionalProfile profile,
        Set<LocalDate> affectedDates
    ) {
        if (profile == null || affectedDates == null || affectedDates.isEmpty()) {
            return;
        }
        Set<LocalDate> normalizedDates = Set.copyOf(affectedDates);
        registerAfterCommit(() -> sideEffectCoordinator.onBookingChanged(profile, normalizedDates));
    }

    private void registerAfterCommit(Runnable action) {
        if (action == null) {
            return;
        }
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
            return;
        }
        action.run();
    }

    private ProfessionalProfile loadProfessionalForBooking(Booking booking) {
        if (booking == null || booking.getProfessionalId() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Profesional no encontrado");
        }
        return professionalProfileRepository.findByIdForUpdate(booking.getProfessionalId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profesional no encontrado"));
    }

    private void recordOperationalStatusEvent(
        Booking booking,
        BookingOperationalStatus previousStatus,
        Long actorUserId
    ) {
        BookingEventType eventType = switch (booking.getOperationalStatus()) {
            case CONFIRMED -> BookingEventType.BOOKING_CONFIRMED;
            case CANCELLED -> BookingEventType.BOOKING_CANCELLED;
            case COMPLETED -> BookingEventType.BOOKING_COMPLETED;
            case NO_SHOW -> BookingEventType.BOOKING_NO_SHOW_MARKED;
            case PENDING -> BookingEventType.BOOKING_CREATED;
        };

        bookingEventService.record(
            booking,
            eventType,
            BookingActorType.PROFESSIONAL,
            actorUserId,
            Map.of(
                "previousStatus", previousStatus == null ? null : previousStatus.name(),
                "nextStatus", booking.getOperationalStatus().name(),
                "timezone", booking.getTimezone()
            )
        );
        switch (eventType) {
            case BOOKING_CREATED -> bookingNotificationIntegrationService.recordBookingCreated(
                booking,
                BookingActorType.PROFESSIONAL,
                actorUserId,
                "update_booking_status_as_professional"
            );
            case BOOKING_CONFIRMED -> bookingNotificationIntegrationService.recordBookingConfirmed(
                booking,
                BookingActorType.PROFESSIONAL,
                actorUserId,
                "update_booking_status_as_professional"
            );
            case BOOKING_CANCELLED -> bookingNotificationIntegrationService.recordBookingCancelled(
                booking,
                BookingActorType.PROFESSIONAL,
                actorUserId,
                "update_booking_status_as_professional"
            );
            case BOOKING_COMPLETED -> bookingNotificationIntegrationService.recordBookingCompleted(
                booking,
                BookingActorType.PROFESSIONAL,
                actorUserId,
                "update_booking_status_as_professional"
            );
            case BOOKING_NO_SHOW_MARKED -> bookingNotificationIntegrationService.recordBookingNoShow(
                booking,
                BookingActorType.PROFESSIONAL,
                actorUserId,
                "update_booking_status_as_professional"
            );
            case BOOKING_RESCHEDULED, BOOKING_FINANCIAL_RECOMPUTED, BOOKING_FINANCIAL_RECONCILED,
                BOOKING_REFUND_RETRY_REQUESTED, BOOKING_PAYOUT_RETRY_REQUESTED -> {
            }
        }
    }

    private record EvaluatedBookingAction(
        ResolvedBookingPolicy resolvedPolicy,
        BookingActionsEvaluation evaluation
    ) {}
}
