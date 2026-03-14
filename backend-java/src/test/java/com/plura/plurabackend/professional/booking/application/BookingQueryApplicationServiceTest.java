package com.plura.plurabackend.professional.booking.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.core.booking.dto.BookingFinancialSummaryResponse;
import com.plura.plurabackend.core.booking.finance.BookingFinanceService;
import com.plura.plurabackend.core.booking.dto.BookingPayoutRecordResponse;
import com.plura.plurabackend.core.booking.dto.BookingRefundRecordResponse;
import com.plura.plurabackend.core.booking.policy.BookingPolicySnapshotService;
import com.plura.plurabackend.core.booking.repository.BookingRepository;
import com.plura.plurabackend.core.booking.time.BookingDateTimeService;
import com.plura.plurabackend.professional.application.ProfessionalAccessSupport;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.plan.PlanGuardService;
import java.util.Map;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class BookingQueryApplicationServiceTest {

    @Test
    void blocksMultiDayQueriesForDailyTier() {
        BookingRepository bookingRepository = mock(BookingRepository.class);
        BookingFinanceService bookingFinanceService = mock(BookingFinanceService.class);
        PlanGuardService planGuardService = mock(PlanGuardService.class);
        ProfessionalAccessSupport professionalAccessSupport = mock(ProfessionalAccessSupport.class);

        BookingQueryApplicationService service = new BookingQueryApplicationService(
            bookingRepository,
            bookingFinanceService,
            mock(BookingPolicySnapshotService.class),
            mock(BookingDateTimeService.class),
            professionalAccessSupport,
            planGuardService
        );

        doThrow(
            new ResponseStatusException(HttpStatus.FORBIDDEN, "Tu plan actual solo permite consultar agenda diaria")
        ).when(planGuardService).requireScheduleRange("21", 2L);

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> service.getProfessionalBookings("21", null, "2026-03-14", "2026-03-15")
        );

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        verify(planGuardService).requireScheduleRange("21", 2L);
    }

    @Test
    void allowsWeeklyRangeWhenGuardPermitsIt() {
        BookingRepository bookingRepository = mock(BookingRepository.class);
        BookingFinanceService bookingFinanceService = mock(BookingFinanceService.class);
        PlanGuardService planGuardService = mock(PlanGuardService.class);
        ProfessionalAccessSupport professionalAccessSupport = mock(ProfessionalAccessSupport.class);
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(21L);

        BookingQueryApplicationService service = new BookingQueryApplicationService(
            bookingRepository,
            bookingFinanceService,
            mock(BookingPolicySnapshotService.class),
            mock(BookingDateTimeService.class),
            professionalAccessSupport,
            planGuardService
        );

        when(professionalAccessSupport.loadProfessionalByUserId("21")).thenReturn(profile);
        when(bookingRepository.findProfessionalBookingResponsesByProfessionalIdAndStartDateTimeBetween(
            org.mockito.ArgumentMatchers.eq(profile.getId()),
            org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.any()
        )).thenReturn(List.of());
        when(bookingRepository.findByIdIn(List.of())).thenReturn(List.of());
        when(bookingFinanceService.findResponseMapByBookingIds(List.of()))
            .thenReturn(Map.<Long, BookingFinancialSummaryResponse>of());
        when(bookingFinanceService.findLatestRefundResponseMapByBookingIds(List.of()))
            .thenReturn(Map.<Long, BookingRefundRecordResponse>of());
        when(bookingFinanceService.findLatestPayoutResponseMapByBookingIds(List.of()))
            .thenReturn(Map.<Long, BookingPayoutRecordResponse>of());

        List<?> result = service.getProfessionalBookings("21", null, "2026-03-10", "2026-03-16");

        assertEquals(0, result.size());
        verify(planGuardService).requireScheduleRange("21", 7L);
    }
}
