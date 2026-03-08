package com.plura.plurabackend.professional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.availability.AvailableSlotAsyncDispatcher;
import com.plura.plurabackend.availability.AvailableSlotService;
import com.plura.plurabackend.availability.ScheduleSummaryService;
import com.plura.plurabackend.booking.actions.BookingActionsEvaluation;
import com.plura.plurabackend.booking.actions.BookingActionsEvaluator;
import com.plura.plurabackend.booking.actions.model.BookingSuggestedAction;
import com.plura.plurabackend.booking.decision.BookingActionDecisionService;
import com.plura.plurabackend.booking.decision.model.BookingActionDecision;
import com.plura.plurabackend.booking.decision.model.BookingActionType;
import com.plura.plurabackend.booking.dto.BookingCommandResponse;
import com.plura.plurabackend.booking.dto.BookingRescheduleRequest;
import com.plura.plurabackend.booking.event.BookingEventService;
import com.plura.plurabackend.booking.finance.BookingFinanceService;
import com.plura.plurabackend.booking.finance.BookingProviderIntegrationService;
import com.plura.plurabackend.booking.model.Booking;
import com.plura.plurabackend.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.booking.model.ServicePaymentType;
import com.plura.plurabackend.booking.policy.BookingPolicySnapshot;
import com.plura.plurabackend.booking.policy.BookingPolicySnapshotService;
import com.plura.plurabackend.booking.policy.ResolvedBookingPolicy;
import com.plura.plurabackend.booking.policy.repository.BookingPolicyRepository;
import com.plura.plurabackend.booking.repository.BookingRepository;
import com.plura.plurabackend.cache.ProfileCacheService;
import com.plura.plurabackend.cache.SlotCacheService;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.photo.repository.BusinessPhotoRepository;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDayDto;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDto;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleRangeDto;
import com.plura.plurabackend.professional.service.model.ProfesionalService;
import com.plura.plurabackend.professional.service.repository.ProfesionalServiceRepository;
import com.plura.plurabackend.productplan.EffectiveProductPlanService;
import com.plura.plurabackend.search.engine.SearchSyncPublisher;
import com.plura.plurabackend.storage.ImageStorageService;
import com.plura.plurabackend.storage.thumbnail.ImageThumbnailJobService;
import com.plura.plurabackend.user.model.User;
import com.plura.plurabackend.user.model.UserRole;
import com.plura.plurabackend.user.repository.UserRepository;
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

class ProfessionalPublicPageCoreServiceRescheduleTest {

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
    private final BookingProviderIntegrationService bookingProviderIntegrationService = mock(BookingProviderIntegrationService.class);
    private final BookingEventService bookingEventService = mock(BookingEventService.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final AvailableSlotService availableSlotService = mock(AvailableSlotService.class);
    private final AvailableSlotAsyncDispatcher availableSlotAsyncDispatcher = mock(AvailableSlotAsyncDispatcher.class);
    private final ScheduleSummaryService scheduleSummaryService = mock(ScheduleSummaryService.class);
    private final SlotCacheService slotCacheService = mock(SlotCacheService.class);
    private final ProfileCacheService profileCacheService = mock(ProfileCacheService.class);
    private final SearchSyncPublisher searchSyncPublisher = mock(SearchSyncPublisher.class);
    private final EffectiveProductPlanService effectiveProductPlanService = mock(EffectiveProductPlanService.class);
    private final ImageStorageService imageStorageService = mock(ImageStorageService.class);
    private final MeterRegistry meterRegistry = mock(MeterRegistry.class);
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    private final ImageThumbnailJobService imageThumbnailJobService = mock(ImageThumbnailJobService.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Executor geocodingExecutor = Runnable::run;

    private final ProfessionalPublicPageCoreService service = new ProfessionalPublicPageCoreService(
        professionalProfileRepository,
        businessPhotoRepository,
        categorySupport,
        profesionalServiceRepository,
        bookingRepository,
        bookingPolicyRepository,
        bookingPolicySnapshotService,
        bookingActionsEvaluator,
        bookingActionDecisionService,
        bookingFinanceService,
        bookingProviderIntegrationService,
        bookingEventService,
        userRepository,
        "America/Montevideo",
        "",
        objectMapper,
        availableSlotService,
        availableSlotAsyncDispatcher,
        scheduleSummaryService,
        slotCacheService,
        profileCacheService,
        searchSyncPublisher,
        effectiveProductPlanService,
        imageStorageService,
        meterRegistry,
        passwordEncoder,
        imageThumbnailJobService,
        geocodingExecutor
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
        booking.setProfessional(profile);
        booking.setService(professionalService);
        booking.setTimezone("America/Montevideo");
        booking.setStartDateTime(originalStart);
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
            false
        );
        BookingActionsEvaluation evaluation = new BookingActionsEvaluation(
            true,
            true,
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
        request.setTimezone("America/Montevideo");

        when(userRepository.findByIdAndDeletedAtIsNull(client.getId())).thenReturn(Optional.of(client));
        when(bookingRepository.findDetailedByIdForUpdate(booking.getId())).thenReturn(Optional.of(booking));
        when(professionalProfileRepository.findByIdForUpdate(profile.getId())).thenReturn(Optional.of(profile));
        when(bookingPolicySnapshotService.resolveForBooking(booking)).thenReturn(
            new ResolvedBookingPolicy(policy, ResolvedBookingPolicy.PolicySnapshotSource.SNAPSHOT)
        );
        when(bookingActionsEvaluator.evaluate(any(), any(), any(), any())).thenReturn(evaluation);
        when(bookingRepository.findBookedWithServiceByProfessionalAndStartDateTimeBetweenExcludingBooking(
            any(),
            any(),
            any(),
            any(),
            anyLong()
        )).thenReturn(List.of());
        when(bookingRepository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(bookingActionDecisionService.record(any(), any(), any(), anyLong(), any(), any(), any(), any()))
            .thenReturn(decision);
        when(bookingProviderIntegrationService.processPostDecision(any(), any())).thenReturn(null);

        BookingCommandResponse response = service.rescheduleBookingAsClient(
            String.valueOf(client.getId()),
            booking.getId(),
            request
        );

        assertEquals(nextStart, booking.getStartDateTime());
        assertEquals("America/Montevideo", booking.getTimezone());
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
