package com.plura.plurabackend.professional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.availability.AvailableSlotAsyncDispatcher;
import com.plura.plurabackend.core.availability.AvailableSlotService;
import com.plura.plurabackend.core.availability.ScheduleSummaryService;
import com.plura.plurabackend.core.booking.actions.BookingActionsEvaluation;
import com.plura.plurabackend.core.booking.actions.BookingActionsEvaluator;
import com.plura.plurabackend.core.booking.actions.model.BookingSuggestedAction;
import com.plura.plurabackend.professional.booking.application.BookingCommandApplicationService;
import com.plura.plurabackend.core.booking.BookingCommandResponseAssembler;
import com.plura.plurabackend.core.booking.BookingCommandStateSupport;
import com.plura.plurabackend.core.booking.BookingFinancialCommandSupport;
import com.plura.plurabackend.core.booking.BookingPaymentsGateway;
import com.plura.plurabackend.professional.booking.application.BookingQueryApplicationService;
import com.plura.plurabackend.core.booking.BookingSchedulingAvailabilityGateway;
import com.plura.plurabackend.core.billing.providerops.ProviderOperationWorker;
import com.plura.plurabackend.core.booking.decision.BookingActionDecisionService;
import com.plura.plurabackend.core.booking.decision.model.BookingActionDecision;
import com.plura.plurabackend.core.booking.decision.model.BookingActionType;
import com.plura.plurabackend.core.booking.dto.BookingCommandResponse;
import com.plura.plurabackend.core.booking.dto.BookingRescheduleRequest;
import com.plura.plurabackend.core.booking.event.BookingEventService;
import com.plura.plurabackend.core.booking.finance.BookingFinanceDispatchPlan;
import com.plura.plurabackend.core.booking.finance.BookingFinanceUpdateResult;
import com.plura.plurabackend.core.booking.finance.BookingFinanceService;
import com.plura.plurabackend.core.booking.finance.model.BookingFinancialStatus;
import com.plura.plurabackend.core.booking.finance.model.BookingFinancialSummary;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.core.booking.model.ServicePaymentType;
import com.plura.plurabackend.core.notification.integration.booking.BookingNotificationIntegrationService;
import com.plura.plurabackend.core.booking.policy.BookingPolicySnapshot;
import com.plura.plurabackend.core.booking.policy.BookingPolicySnapshotService;
import com.plura.plurabackend.core.booking.policy.ResolvedBookingPolicy;
import com.plura.plurabackend.core.booking.policy.model.LateCancellationRefundMode;
import com.plura.plurabackend.core.booking.policy.repository.BookingPolicyRepository;
import com.plura.plurabackend.core.booking.repository.BookingRepository;
import com.plura.plurabackend.core.booking.time.BookingDateTimeService;
import com.plura.plurabackend.core.cache.ProfileCacheService;
import com.plura.plurabackend.core.cache.SlotCacheService;
import com.plura.plurabackend.professional.profile.ProfessionalCategorySupport;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.photo.repository.BusinessPhotoRepository;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDayDto;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDto;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleRangeDto;
import com.plura.plurabackend.professional.service.model.ProfesionalService;
import com.plura.plurabackend.professional.service.repository.ProfesionalServiceRepository;
import com.plura.plurabackend.professional.application.ProfessionalAccessSupport;
import com.plura.plurabackend.professional.application.ProfessionalSideEffectCoordinator;
import com.plura.plurabackend.core.search.engine.SearchSyncPublisher;
import com.plura.plurabackend.core.storage.ImageStorageService;
import com.plura.plurabackend.core.storage.thumbnail.ImageThumbnailJobService;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.model.UserRole;
import com.plura.plurabackend.core.user.repository.UserRepository;
import io.micrometer.core.instrument.MeterRegistry;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.Executor;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

class BookingCommandApplicationServiceRescheduleTest {

    private final ProfessionalProfileRepository professionalProfileRepository = mock(ProfessionalProfileRepository.class);
    private final BusinessPhotoRepository businessPhotoRepository = mock(BusinessPhotoRepository.class);
    private final ProfessionalCategorySupport categorySupport = mock(ProfessionalCategorySupport.class);
    private final ProfesionalServiceRepository profesionalServiceRepository = mock(ProfesionalServiceRepository.class);
    private final BookingRepository bookingRepository = mock(BookingRepository.class);
    private final BookingPolicyRepository bookingPolicyRepository = mock(BookingPolicyRepository.class);
    private final BookingPolicySnapshotService bookingPolicySnapshotService = mock(BookingPolicySnapshotService.class);
    private final BookingActionsEvaluator bookingActionsEvaluator = mock(BookingActionsEvaluator.class);
    private final BookingActionDecisionService bookingActionDecisionService = mock(BookingActionDecisionService.class);
    private final BookingFinanceService bookingFinanceService = mock(BookingFinanceService.class);
    private final BookingPaymentsGateway bookingPaymentsGateway = mock(BookingPaymentsGateway.class);
    private final BookingSchedulingAvailabilityGateway bookingSchedulingAvailabilityGateway = mock(
        BookingSchedulingAvailabilityGateway.class
    );
    private final BookingEventService bookingEventService = mock(BookingEventService.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final AvailableSlotService availableSlotService = mock(AvailableSlotService.class);
    private final AvailableSlotAsyncDispatcher availableSlotAsyncDispatcher = mock(AvailableSlotAsyncDispatcher.class);
    private final ScheduleSummaryService scheduleSummaryService = mock(ScheduleSummaryService.class);
    private final SlotCacheService slotCacheService = mock(SlotCacheService.class);
    private final ProfileCacheService profileCacheService = mock(ProfileCacheService.class);
    private final SearchSyncPublisher searchSyncPublisher = mock(SearchSyncPublisher.class);
    private final ImageStorageService imageStorageService = mock(ImageStorageService.class);
    private final MeterRegistry meterRegistry = mock(MeterRegistry.class);
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    private final ImageThumbnailJobService imageThumbnailJobService = mock(ImageThumbnailJobService.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Executor geocodingExecutor = Runnable::run;
    private final BookingDateTimeService bookingDateTimeService = new BookingDateTimeService("America/Montevideo");
    private final ProfessionalAccessSupport professionalAccessSupport = new ProfessionalAccessSupport(
        professionalProfileRepository,
        userRepository
    );
    private final ProfessionalSideEffectCoordinator sideEffectCoordinator = mock(ProfessionalSideEffectCoordinator.class);
    private final ProviderOperationWorker providerOperationWorker = mock(ProviderOperationWorker.class);
    private final BookingCommandStateSupport bookingCommandStateSupport = new BookingCommandStateSupport(
        bookingDateTimeService
    );
    private final BookingFinancialCommandSupport bookingFinancialCommandSupport = new BookingFinancialCommandSupport(
        bookingFinanceService,
        bookingPaymentsGateway,
        providerOperationWorker
    );
    private final BookingCommandResponseAssembler bookingCommandResponseAssembler = new BookingCommandResponseAssembler(
        bookingFinanceService,
        bookingPolicySnapshotService,
        bookingActionDecisionService,
        bookingDateTimeService
    );
    private final BookingNotificationIntegrationService bookingNotificationIntegrationService =
        mock(BookingNotificationIntegrationService.class);
    private final BookingCommandApplicationService bookingCommandApplicationService = new BookingCommandApplicationService(
        professionalProfileRepository,
        profesionalServiceRepository,
        bookingRepository,
        bookingPolicySnapshotService,
        bookingActionsEvaluator,
        bookingActionDecisionService,
        bookingFinanceService,
        bookingSchedulingAvailabilityGateway,
        bookingEventService,
        userRepository,
        bookingDateTimeService,
        professionalAccessSupport,
        sideEffectCoordinator,
        bookingFinancialCommandSupport,
        bookingCommandResponseAssembler,
        bookingCommandStateSupport,
        bookingNotificationIntegrationService,
        meterRegistry,
        passwordEncoder,
        "America/Montevideo"
    );

    @Test
    void shouldRescheduleClientBookingAndIncrementRescheduleCount() throws Exception {
        LocalDate targetDate = LocalDate.now().plusDays(30);
        LocalDateTime originalStart = targetDate.atTime(10, 0);
        LocalDateTime nextStart = targetDate.atTime(12, 0);

        User client = user(10L, "Cliente", UserRole.USER);
        User professionalUser = user(20L, "Profesional", UserRole.PROFESSIONAL);

        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(30L);
        profile.setUser(professionalUser);
        profile.setActive(true);
        profile.setSlug("pro-demo");
        profile.setSlotDurationMinutes(60);
        profile.setScheduleJson(writeScheduleJson(targetDate.getDayOfWeek()));

        ProfesionalService professionalService = new ProfesionalService();
        professionalService.setId("svc-1");
        professionalService.setProfessional(profile);
        professionalService.setName("Corte");
        professionalService.setDuration("60 min");
        professionalService.setPostBufferMinutes(0);
        professionalService.setPaymentType(ServicePaymentType.ON_SITE);
        professionalService.setActive(true);

        Booking booking = new Booking();
        booking.setId(40L);
        booking.setUser(client);
        booking.setProfessionalId(profile.getId());
        booking.setProfessionalSlugSnapshot(profile.getSlug());
        booking.setProfessionalDisplayNameSnapshot(professionalUser.getFullName());
        booking.setServiceId(professionalService.getId());
        booking.setTimezone("America/Montevideo");
        booking.setStartDateTime(originalStart);
        booking.setStartDateTimeUtc(originalStart.atZone(java.time.ZoneId.of("America/Montevideo")).toInstant());
        booking.setOperationalStatus(BookingOperationalStatus.CONFIRMED);
        booking.setRescheduleCount(0);
        booking.setServiceNameSnapshot("Corte");
        booking.setServiceDurationSnapshot("60 min");
        booking.setServicePostBufferMinutesSnapshot(0);
        booking.setServicePaymentTypeSnapshot(ServicePaymentType.ON_SITE);
        booking.setServicePriceSnapshot(BigDecimal.ZERO);

        BookingPolicySnapshot policy = new BookingPolicySnapshot(
            "policy-1",
            1L,
            profile.getId(),
            LocalDateTime.now(),
            true,
            true,
            null,
            null,
            1,
            LateCancellationRefundMode.FULL,
            BigDecimal.valueOf(100)
        );
        BookingActionsEvaluation evaluation = new BookingActionsEvaluation(
            true,
            true,
            false,
            false,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            "UYU",
            BookingSuggestedAction.NONE,
            List.of(),
            "booking.actions.reschedule_only_available",
            Map.of(),
            "La reserva puede reagendarse."
        );

        BookingActionDecision decision = new BookingActionDecision();
        decision.setId("decision-1");
        decision.setBooking(booking);
        decision.setActionType(BookingActionType.RESCHEDULE);

        BookingRescheduleRequest request = new BookingRescheduleRequest();
        request.setStartDateTime(nextStart.toString());
        request.setTimezone("Europe/Madrid");

        when(userRepository.findByIdAndDeletedAtIsNull(client.getId())).thenReturn(Optional.of(client));
        when(bookingRepository.findDetailedByIdForUpdate(booking.getId())).thenReturn(Optional.of(booking));
        when(professionalProfileRepository.findByIdForUpdate(profile.getId())).thenReturn(Optional.of(profile));
        when(bookingPolicySnapshotService.resolveForBooking(booking)).thenReturn(
            new ResolvedBookingPolicy(policy, ResolvedBookingPolicy.PolicySnapshotSource.SNAPSHOT)
        );
        when(bookingActionsEvaluator.evaluate(any(), any(), any(), any())).thenReturn(evaluation);
        when(bookingSchedulingAvailabilityGateway.isSlotAvailable(anyLong(), any(), any(), anyLong())).thenReturn(true);
        when(bookingRepository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(bookingActionDecisionService.record(any(), any(), any(), anyLong(), any(), any(), any(), any()))
            .thenReturn(decision);
        BookingFinancialSummary summary = new BookingFinancialSummary();
        summary.setBooking(booking);
        summary.setCurrency("UYU");
        summary.setFinancialStatus(BookingFinancialStatus.NOT_REQUIRED);
        summary.setAmountCharged(BigDecimal.ZERO);
        summary.setAmountHeld(BigDecimal.ZERO);
        summary.setAmountToRefund(BigDecimal.ZERO);
        summary.setAmountRefunded(BigDecimal.ZERO);
        summary.setAmountToRelease(BigDecimal.ZERO);
        summary.setAmountReleased(BigDecimal.ZERO);

        BookingFinanceUpdateResult financeResult = new BookingFinanceUpdateResult(summary, null, null);
        when(bookingFinanceService.applyDecision(any(), any())).thenReturn(financeResult);
        when(bookingPaymentsGateway.processPostDecision(any(), any()))
            .thenReturn(new BookingFinanceDispatchPlan(financeResult, List.of()));
        when(bookingFinanceService.ensureInitializedWithEvidence(any())).thenReturn(summary);

        BookingCommandResponse response = bookingCommandApplicationService.rescheduleBookingAsClient(
            String.valueOf(client.getId()),
            booking.getId(),
            request
        );

        assertEquals(nextStart, booking.getStartDateTime());
        assertEquals("America/Montevideo", booking.getTimezone());
        assertEquals(nextStart.atZone(java.time.ZoneId.of("America/Montevideo")).toInstant(), booking.getStartDateTimeUtc());
        assertEquals(1, booking.getRescheduleCount());
        assertNotNull(response.getBooking());
        assertEquals(nextStart.toString(), response.getBooking().getStartDateTime());
    }

    private String writeScheduleJson(DayOfWeek dayOfWeek) throws Exception {
        ProfesionalScheduleRangeDto range = new ProfesionalScheduleRangeDto();
        range.setStart("09:00");
        range.setEnd("18:00");

        ProfesionalScheduleDayDto day = new ProfesionalScheduleDayDto();
        day.setDay(toDayKey(dayOfWeek));
        day.setEnabled(true);
        day.setPaused(false);
        day.setRanges(List.of(range));

        ProfesionalScheduleDto schedule = new ProfesionalScheduleDto();
        schedule.setDays(List.of(day));
        schedule.setPauses(List.of());
        schedule.setSlotDurationMinutes(60);
        return objectMapper.writeValueAsString(schedule);
    }

    private String toDayKey(DayOfWeek dayOfWeek) {
        return switch (dayOfWeek) {
            case MONDAY -> "mon";
            case TUESDAY -> "tue";
            case WEDNESDAY -> "wed";
            case THURSDAY -> "thu";
            case FRIDAY -> "fri";
            case SATURDAY -> "sat";
            case SUNDAY -> "sun";
        };
    }

    private User user(Long id, String fullName, UserRole role) {
        User user = new User();
        user.setId(id);
        user.setFullName(fullName);
        user.setRole(role);
        return user;
    }
}
