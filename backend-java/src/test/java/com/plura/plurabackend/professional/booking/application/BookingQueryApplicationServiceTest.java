package com.plura.plurabackend.professional.booking.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.mock;

import com.plura.plurabackend.core.booking.dto.BookingFinancialSummaryResponse;
import com.plura.plurabackend.core.booking.finance.BookingFinanceService;
import com.plura.plurabackend.core.booking.dto.BookingPayoutRecordResponse;
import com.plura.plurabackend.core.booking.dto.BookingRefundRecordResponse;
import com.plura.plurabackend.core.booking.policy.BookingPolicySnapshotService;
import com.plura.plurabackend.core.booking.repository.BookingRepository;
import com.plura.plurabackend.core.booking.time.BookingDateTimeService;
import com.plura.plurabackend.professional.application.ProfessionalAccessSupport;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import java.util.Map;
import java.util.List;
import org.junit.jupiter.api.Test;

class BookingQueryApplicationServiceTest {

    @Test
    void allowsOperationalReservationQueriesAcrossMultipleDays() {
        BookingRepository bookingRepository = mock(BookingRepository.class);
        BookingFinanceService bookingFinanceService = mock(BookingFinanceService.class);
        ProfessionalAccessSupport professionalAccessSupport = mock(ProfessionalAccessSupport.class);
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(21L);

        BookingQueryApplicationService service = new BookingQueryApplicationService(
            bookingRepository,
            bookingFinanceService,
            mock(BookingPolicySnapshotService.class),
            mock(BookingDateTimeService.class),
            professionalAccessSupport
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

        List<?> result = service.getProfessionalBookings("21", null, "2026-03-14", "2026-03-15");

        assertEquals(0, result.size());
        verify(professionalAccessSupport).loadProfessionalByUserId("21");
    }

    @Test
    void stillLoadsSingleDayQueries() {
        BookingRepository bookingRepository = mock(BookingRepository.class);
        BookingFinanceService bookingFinanceService = mock(BookingFinanceService.class);
        ProfessionalAccessSupport professionalAccessSupport = mock(ProfessionalAccessSupport.class);
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(21L);

        BookingQueryApplicationService service = new BookingQueryApplicationService(
            bookingRepository,
            bookingFinanceService,
            mock(BookingPolicySnapshotService.class),
            mock(BookingDateTimeService.class),
            professionalAccessSupport
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

        List<?> result = service.getProfessionalBookings("21", "2026-03-10", null, null);

        assertEquals(0, result.size());
        verify(professionalAccessSupport).loadProfessionalByUserId("21");
    }
}
