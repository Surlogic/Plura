package com.plura.plurabackend.professional.analytics;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.core.booking.dto.ProfessionalBookingResponse;
import com.plura.plurabackend.core.booking.repository.BookingRepository;
import com.plura.plurabackend.professional.application.ProfessionalAccessSupport;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.plan.AnalyticsTier;
import com.plura.plurabackend.professional.plan.PlanGuardService;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDayDto;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDto;
import com.plura.plurabackend.professional.schedule.application.ScheduleApplicationService;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;

class ProfessionalAnalyticsServiceTest {

    @Test
    void requiresAdvancedTierForAdvancedView() {
        BookingRepository bookingRepository = mock(BookingRepository.class);
        ProfessionalAccessSupport professionalAccessSupport = mock(ProfessionalAccessSupport.class);
        ScheduleApplicationService scheduleApplicationService = mock(ScheduleApplicationService.class);
        PlanGuardService planGuardService = mock(PlanGuardService.class);
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(21L);

        ProfessionalAnalyticsService service = new ProfessionalAnalyticsService(
            bookingRepository,
            professionalAccessSupport,
            scheduleApplicationService,
            planGuardService
        );
        LocalDate today = LocalDate.now();

        when(professionalAccessSupport.loadProfessionalByUserId("21")).thenReturn(profile);
        when(bookingRepository.findProfessionalBookingResponsesByProfessionalIdAndStartDateTimeBetween(
            org.mockito.ArgumentMatchers.eq(profile.getId()),
            org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.any()
        )).thenReturn(List.of(
            bookingResponse(today.atTime(10, 0).toString(), "CONFIRMED", "Ana"),
            bookingResponse(today.atTime(12, 0).toString(), "COMPLETED", "Ana"),
            bookingResponse(today.minusDays(1).atTime(9, 0).toString(), "CANCELLED", "Luis"),
            bookingResponse(today.minusDays(2).atTime(9, 0).toString(), "NO_SHOW", "Carla")
        ));
        when(scheduleApplicationService.getSchedule("21")).thenReturn(new ProfesionalScheduleDto(
            List.of(
                new ProfesionalScheduleDayDto("mon", true, false, List.of()),
                new ProfesionalScheduleDayDto("tue", true, false, List.of()),
                new ProfesionalScheduleDayDto("wed", true, false, List.of()),
                new ProfesionalScheduleDayDto("thu", true, false, List.of()),
                new ProfesionalScheduleDayDto("fri", true, false, List.of()),
                new ProfesionalScheduleDayDto("sat", false, false, List.of()),
                new ProfesionalScheduleDayDto("sun", false, false, List.of())
            ),
            List.of(),
            30
        ));

        var response = service.getSummary("21", ProfessionalAnalyticsView.ADVANCED);

        verify(planGuardService).requireAnalyticsTier("21", AnalyticsTier.ADVANCED);
        assertEquals(Integer.valueOf(1), response.getCancelledBookings());
        assertEquals(Integer.valueOf(1), response.getNoShowBookings());
        assertEquals(Integer.valueOf(1), response.getCompletedBookings());
    }

    @Test
    void requiresBasicTierForBasicView() {
        BookingRepository bookingRepository = mock(BookingRepository.class);
        ProfessionalAccessSupport professionalAccessSupport = mock(ProfessionalAccessSupport.class);
        ScheduleApplicationService scheduleApplicationService = mock(ScheduleApplicationService.class);
        PlanGuardService planGuardService = mock(PlanGuardService.class);
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(21L);

        ProfessionalAnalyticsService service = new ProfessionalAnalyticsService(
            bookingRepository,
            professionalAccessSupport,
            scheduleApplicationService,
            planGuardService
        );

        when(professionalAccessSupport.loadProfessionalByUserId("21")).thenReturn(profile);
        when(bookingRepository.findProfessionalBookingResponsesByProfessionalIdAndStartDateTimeBetween(
            org.mockito.ArgumentMatchers.eq(profile.getId()),
            org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.any()
        )).thenReturn(List.of());
        when(scheduleApplicationService.getSchedule("21")).thenReturn(new ProfesionalScheduleDto(List.of(), List.of(), 30));

        service.getSummary("21", ProfessionalAnalyticsView.BASIC);

        verify(planGuardService).requireAnalyticsTier("21", AnalyticsTier.BASIC);
    }

    private ProfessionalBookingResponse bookingResponse(String startDateTime, String status, String clientName) {
        ProfessionalBookingResponse response = new ProfessionalBookingResponse();
        response.setStartDateTime(LocalDateTime.parse(startDateTime).toString());
        response.setStatus(status);
        response.setClientName(clientName);
        return response;
    }
}
