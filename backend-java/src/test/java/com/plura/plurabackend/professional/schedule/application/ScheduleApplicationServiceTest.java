package com.plura.plurabackend.professional.schedule.application;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.core.booking.model.ServicePaymentType;
import com.plura.plurabackend.core.booking.repository.BookingRepository;
import com.plura.plurabackend.core.cache.SlotCacheService;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.repository.UserRepository;
import com.plura.plurabackend.professional.application.ProfessionalAccessSupport;
import com.plura.plurabackend.professional.application.ProfessionalSideEffectCoordinator;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDayDto;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDto;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleRangeDto;
import com.plura.plurabackend.professional.service.model.ProfesionalService;
import com.plura.plurabackend.professional.service.repository.ProfesionalServiceRepository;
import com.plura.plurabackend.professional.worker.repository.ProfessionalWorkerRepository;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class ScheduleApplicationServiceTest {

    private final ProfessionalProfileRepository professionalProfileRepository = mock(ProfessionalProfileRepository.class);
    private final ProfesionalServiceRepository profesionalServiceRepository = mock(ProfesionalServiceRepository.class);
    private final BookingRepository bookingRepository = mock(BookingRepository.class);
    private final SlotCacheService slotCacheService = mock(SlotCacheService.class);
    private final ProfessionalWorkerRepository professionalWorkerRepository = mock(ProfessionalWorkerRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final ProfessionalAccessSupport professionalAccessSupport = new ProfessionalAccessSupport(
        professionalProfileRepository,
        userRepository
    );
    private final ProfessionalSideEffectCoordinator sideEffectCoordinator = mock(ProfessionalSideEffectCoordinator.class);
    private final ScheduleApplicationService service = new ScheduleApplicationService(
        professionalProfileRepository,
        profesionalServiceRepository,
        bookingRepository,
        slotCacheService,
        new ObjectMapper(),
        professionalAccessSupport,
        sideEffectCoordinator,
        professionalWorkerRepository,
        new SimpleMeterRegistry(),
        "America/Montevideo"
    );

    @Test
    void pendingBookingBlocksSlotAndCancelledBookingReleasesIt() throws Exception {
        LocalDate targetDate = LocalDate.now(ZoneId.of("America/Montevideo")).plusDays(10);
        ProfessionalProfile profile = buildProfile("pro-demo", writeScheduleJson(targetDate.getDayOfWeek(), 30));
        ProfesionalService professionalService = buildService(profile, "svc-1", "60 min", 0);
        Booking pendingBooking = buildBooking(
            profile.getId(),
            targetDate.atTime(10, 0),
            "60 min",
            0,
            BookingOperationalStatus.PENDING
        );

        when(professionalProfileRepository.findSchedulingProfileBySlug("pro-demo")).thenReturn(Optional.of(profile));
        when(profesionalServiceRepository.findById("svc-1")).thenReturn(Optional.of(professionalService));
        when(slotCacheService.getSlots(anyString())).thenReturn(Optional.empty());
        doNothing().when(slotCacheService).putSlots(anyString(), org.mockito.ArgumentMatchers.anyList());
        when(bookingRepository.findBookedWithServiceByProfessionalIdAndStartDateTimeBetween(
            org.mockito.ArgumentMatchers.eq(profile.getId()),
            org.mockito.ArgumentMatchers.any(LocalDateTime.class),
            org.mockito.ArgumentMatchers.any(LocalDateTime.class),
            org.mockito.ArgumentMatchers.eq(BookingOperationalStatus.CANCELLED)
        )).thenReturn(List.of(pendingBooking)).thenReturn(List.of());

        List<String> blockedSlots = service.getAvailableSlots("pro-demo", targetDate.toString(), "svc-1");
        List<String> releasedSlots = service.getAvailableSlots("pro-demo", targetDate.toString(), "svc-1");

        assertFalse(blockedSlots.contains("10:00"));
        assertTrue(releasedSlots.contains("10:00"));
    }

    @Test
    void postBufferKeepsFollowingSlotBlocked() throws Exception {
        LocalDate targetDate = LocalDate.now(ZoneId.of("America/Montevideo")).plusDays(10);
        ProfessionalProfile profile = buildProfile("pro-demo", writeScheduleJson(targetDate.getDayOfWeek(), 30));
        ProfesionalService professionalService = buildService(profile, "svc-1", "60 min", 0);
        Booking pendingBooking = buildBooking(
            profile.getId(),
            targetDate.atTime(10, 0),
            "60 min",
            30,
            BookingOperationalStatus.PENDING
        );

        when(professionalProfileRepository.findById(profile.getId())).thenReturn(Optional.of(profile));
        when(profesionalServiceRepository.findById("svc-1")).thenReturn(Optional.of(professionalService));
        when(bookingRepository.findBookedWithServiceByProfessionalIdAndStartDateTimeBetween(
            org.mockito.ArgumentMatchers.eq(profile.getId()),
            org.mockito.ArgumentMatchers.any(LocalDateTime.class),
            org.mockito.ArgumentMatchers.any(LocalDateTime.class),
            org.mockito.ArgumentMatchers.eq(BookingOperationalStatus.CANCELLED)
        )).thenReturn(List.of(pendingBooking));

        boolean available = service.isSlotAvailable(profile.getId(), "svc-1", targetDate.atTime(11, 0), null);

        assertFalse(available);
    }

    private ProfessionalProfile buildProfile(String slug, String scheduleJson) {
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(30L);
        profile.setSlug(slug);
        profile.setActive(true);
        profile.setScheduleJson(scheduleJson);
        profile.setSlotDurationMinutes(30);
        profile.setUser(new User());
        return profile;
    }

    private ProfesionalService buildService(
        ProfessionalProfile profile,
        String serviceId,
        String duration,
        int postBufferMinutes
    ) {
        ProfesionalService professionalService = new ProfesionalService();
        professionalService.setId(serviceId);
        professionalService.setProfessional(profile);
        professionalService.setName("Corte");
        professionalService.setPrice("1000");
        professionalService.setDuration(duration);
        professionalService.setPostBufferMinutes(postBufferMinutes);
        professionalService.setPaymentType(ServicePaymentType.ON_SITE);
        professionalService.setActive(true);
        return professionalService;
    }

    private Booking buildBooking(
        Long professionalId,
        LocalDateTime startDateTime,
        String duration,
        int postBufferMinutes,
        BookingOperationalStatus status
    ) {
        Booking booking = new Booking();
        booking.setId(40L);
        booking.setProfessionalId(professionalId);
        booking.setStartDateTime(startDateTime);
        booking.setServiceDurationSnapshot(duration);
        booking.setServicePostBufferMinutesSnapshot(postBufferMinutes);
        booking.setOperationalStatus(status);
        booking.setTimezone("America/Montevideo");
        User user = new User();
        user.setId(10L);
        booking.setUser(user);
        return booking;
    }

    private String writeScheduleJson(DayOfWeek dayOfWeek, int slotDurationMinutes) throws Exception {
        ProfesionalScheduleRangeDto range = new ProfesionalScheduleRangeDto();
        range.setStart("09:00");
        range.setEnd("12:00");

        ProfesionalScheduleDayDto day = new ProfesionalScheduleDayDto();
        day.setDay(toDayKey(dayOfWeek));
        day.setEnabled(true);
        day.setPaused(false);
        day.setRanges(List.of(range));

        ProfesionalScheduleDto schedule = new ProfesionalScheduleDto();
        schedule.setDays(List.of(day));
        schedule.setPauses(List.of());
        schedule.setSlotDurationMinutes(slotDurationMinutes);
        return new ObjectMapper().writeValueAsString(schedule);
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
}
