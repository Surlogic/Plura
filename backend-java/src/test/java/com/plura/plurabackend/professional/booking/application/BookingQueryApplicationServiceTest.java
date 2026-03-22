package com.plura.plurabackend.professional.booking.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.core.booking.BookingPaymentsGateway;
import com.plura.plurabackend.core.booking.dto.BookingFinancialSummaryResponse;
import com.plura.plurabackend.core.booking.finance.BookingFinanceService;
import com.plura.plurabackend.core.booking.dto.BookingPayoutRecordResponse;
import com.plura.plurabackend.core.booking.dto.BookingRefundRecordResponse;
import com.plura.plurabackend.core.booking.dto.ProfessionalBookingResponse;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.core.booking.model.ServicePaymentType;
import com.plura.plurabackend.core.booking.policy.ResolvedBookingPolicy;
import com.plura.plurabackend.core.booking.policy.BookingPolicySnapshotService;
import com.plura.plurabackend.core.booking.repository.BookingRepository;
import com.plura.plurabackend.core.booking.time.BookingDateTimeService;
import com.plura.plurabackend.professional.application.ProfessionalAccessSupport;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class BookingQueryApplicationServiceTest {

    @Test
    void allowsOperationalReservationQueriesAcrossMultipleDays() {
        BookingRepository bookingRepository = mock(BookingRepository.class);
        BookingFinanceService bookingFinanceService = mock(BookingFinanceService.class);
        BookingPaymentsGateway bookingPaymentsGateway = mock(BookingPaymentsGateway.class);
        ProfessionalAccessSupport professionalAccessSupport = mock(ProfessionalAccessSupport.class);
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(21L);

        BookingQueryApplicationService service = new BookingQueryApplicationService(
            bookingRepository,
            bookingFinanceService,
            bookingPaymentsGateway,
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
        BookingPaymentsGateway bookingPaymentsGateway = mock(BookingPaymentsGateway.class);
        ProfessionalAccessSupport professionalAccessSupport = mock(ProfessionalAccessSupport.class);
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(21L);

        BookingQueryApplicationService service = new BookingQueryApplicationService(
            bookingRepository,
            bookingFinanceService,
            bookingPaymentsGateway,
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

    @Test
    void syncsPendingPrepaidBookingsBeforeBuildingProfessionalList() {
        BookingRepository bookingRepository = mock(BookingRepository.class);
        BookingFinanceService bookingFinanceService = mock(BookingFinanceService.class);
        BookingPaymentsGateway bookingPaymentsGateway = mock(BookingPaymentsGateway.class);
        ProfessionalAccessSupport professionalAccessSupport = mock(ProfessionalAccessSupport.class);
        BookingPolicySnapshotService bookingPolicySnapshotService = mock(BookingPolicySnapshotService.class);
        BookingDateTimeService bookingDateTimeService = mock(BookingDateTimeService.class);
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(21L);

        BookingQueryApplicationService service = new BookingQueryApplicationService(
            bookingRepository,
            bookingFinanceService,
            bookingPaymentsGateway,
            bookingPolicySnapshotService,
            bookingDateTimeService,
            professionalAccessSupport
        );

        ProfessionalBookingResponse bookingResponse = new ProfessionalBookingResponse();
        bookingResponse.setId(44L);
        bookingResponse.setStatus("PENDING");

        Booking bookingEntity = new Booking();
        bookingEntity.setId(44L);
        bookingEntity.setOperationalStatus(BookingOperationalStatus.PENDING);
        bookingEntity.setServicePaymentTypeSnapshot(ServicePaymentType.FULL_PREPAY);
        bookingEntity.setStartDateTime(LocalDateTime.of(2026, 3, 10, 9, 0));

        when(professionalAccessSupport.loadProfessionalByUserId("21")).thenReturn(profile);
        when(bookingRepository.findProfessionalBookingResponsesByProfessionalIdAndStartDateTimeBetween(
            org.mockito.ArgumentMatchers.eq(profile.getId()),
            org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.any()
        )).thenReturn(List.of(bookingResponse));
        when(bookingRepository.findByIdIn(List.of(44L))).thenReturn(List.of(bookingEntity));
        when(bookingFinanceService.findResponseMapByBookingIds(List.of(44L)))
            .thenReturn(Map.<Long, BookingFinancialSummaryResponse>of());
        when(bookingFinanceService.findLatestRefundResponseMapByBookingIds(List.of(44L)))
            .thenReturn(Map.<Long, BookingRefundRecordResponse>of());
        when(bookingFinanceService.findLatestPayoutResponseMapByBookingIds(List.of(44L)))
            .thenReturn(Map.<Long, BookingPayoutRecordResponse>of());
        when(bookingDateTimeService.toUtcString(bookingEntity)).thenReturn("2026-03-10T12:00:00Z");
        when(bookingPolicySnapshotService.resolveForBooking(bookingEntity)).thenReturn(null);
        when(bookingPolicySnapshotService.toResponse((ResolvedBookingPolicy) null)).thenReturn(null);

        List<?> result = service.getProfessionalBookings("21", "2026-03-10", null, null);

        assertEquals(1, result.size());
        verify(bookingPaymentsGateway).syncPendingChargeStatus(44L);
    }

    @Test
    void keepsProfessionalListAvailableWhenPendingPaymentSyncFails() {
        BookingRepository bookingRepository = mock(BookingRepository.class);
        BookingFinanceService bookingFinanceService = mock(BookingFinanceService.class);
        BookingPaymentsGateway bookingPaymentsGateway = mock(BookingPaymentsGateway.class);
        ProfessionalAccessSupport professionalAccessSupport = mock(ProfessionalAccessSupport.class);
        BookingPolicySnapshotService bookingPolicySnapshotService = mock(BookingPolicySnapshotService.class);
        BookingDateTimeService bookingDateTimeService = mock(BookingDateTimeService.class);
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(21L);

        BookingQueryApplicationService service = new BookingQueryApplicationService(
            bookingRepository,
            bookingFinanceService,
            bookingPaymentsGateway,
            bookingPolicySnapshotService,
            bookingDateTimeService,
            professionalAccessSupport
        );

        ProfessionalBookingResponse bookingResponse = new ProfessionalBookingResponse();
        bookingResponse.setId(44L);
        bookingResponse.setStatus("PENDING");

        Booking bookingEntity = new Booking();
        bookingEntity.setId(44L);
        bookingEntity.setOperationalStatus(BookingOperationalStatus.PENDING);
        bookingEntity.setServicePaymentTypeSnapshot(ServicePaymentType.FULL_PREPAY);
        bookingEntity.setStartDateTime(LocalDateTime.of(2026, 3, 10, 9, 0));

        when(professionalAccessSupport.loadProfessionalByUserId("21")).thenReturn(profile);
        when(bookingRepository.findProfessionalBookingResponsesByProfessionalIdAndStartDateTimeBetween(
            org.mockito.ArgumentMatchers.eq(profile.getId()),
            org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.any()
        )).thenReturn(List.of(bookingResponse));
        when(bookingRepository.findByIdIn(List.of(44L))).thenReturn(List.of(bookingEntity));
        when(bookingFinanceService.findResponseMapByBookingIds(List.of(44L)))
            .thenReturn(Map.<Long, BookingFinancialSummaryResponse>of());
        when(bookingFinanceService.findLatestRefundResponseMapByBookingIds(List.of(44L)))
            .thenReturn(Map.<Long, BookingRefundRecordResponse>of());
        when(bookingFinanceService.findLatestPayoutResponseMapByBookingIds(List.of(44L)))
            .thenReturn(Map.<Long, BookingPayoutRecordResponse>of());
        when(bookingDateTimeService.toUtcString(bookingEntity)).thenReturn("2026-03-10T12:00:00Z");
        when(bookingPolicySnapshotService.resolveForBooking(bookingEntity)).thenReturn(null);
        when(bookingPolicySnapshotService.toResponse((ResolvedBookingPolicy) null)).thenReturn(null);
        doThrow(new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Provider no disponible"))
            .when(bookingPaymentsGateway)
            .syncPendingChargeStatus(44L);

        List<?> result = service.getProfessionalBookings("21", "2026-03-10", null, null);

        assertEquals(1, result.size());
        verify(bookingPaymentsGateway).syncPendingChargeStatus(44L);
    }
}
