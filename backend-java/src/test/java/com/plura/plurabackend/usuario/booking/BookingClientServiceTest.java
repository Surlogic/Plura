package com.plura.plurabackend.usuario.booking;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.core.booking.bridge.BookingClientProfessionalView;
import com.plura.plurabackend.core.booking.bridge.BookingClientProfessionalViewGateway;
import com.plura.plurabackend.core.booking.dto.BookingFinancialSummaryResponse;
import com.plura.plurabackend.core.booking.dto.BookingPayoutRecordResponse;
import com.plura.plurabackend.core.booking.dto.BookingRefundRecordResponse;
import com.plura.plurabackend.core.booking.finance.BookingFinanceService;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.core.booking.model.ServicePaymentType;
import com.plura.plurabackend.core.booking.policy.BookingPolicySnapshotService;
import com.plura.plurabackend.core.booking.policy.ResolvedBookingPolicy;
import com.plura.plurabackend.core.booking.repository.BookingRepository;
import com.plura.plurabackend.core.booking.time.BookingDateTimeService;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.model.UserRole;
import com.plura.plurabackend.core.user.repository.UserRepository;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class BookingClientServiceTest {

    @Test
    void returnsClientBookingsWithoutSyncingPayments() {
        BookingRepository bookingRepository = mock(BookingRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        BookingFinanceService bookingFinanceService = mock(BookingFinanceService.class);
        BookingPolicySnapshotService bookingPolicySnapshotService = mock(BookingPolicySnapshotService.class);
        BookingDateTimeService bookingDateTimeService = mock(BookingDateTimeService.class);
        BookingClientProfessionalViewGateway bookingClientProfessionalViewGateway = mock(BookingClientProfessionalViewGateway.class);

        BookingClientService service = new BookingClientService(
            bookingRepository,
            userRepository,
            bookingFinanceService,
            bookingPolicySnapshotService,
            bookingDateTimeService,
            bookingClientProfessionalViewGateway,
            new SimpleMeterRegistry(),
            "America/Montevideo"
        );

        User user = new User();
        user.setId(7L);
        user.setRole(UserRole.USER);

        Booking booking = new Booking();
        booking.setId(44L);
        booking.setUser(user);
        booking.setOperationalStatus(BookingOperationalStatus.PENDING);
        booking.setServicePaymentTypeSnapshot(ServicePaymentType.FULL_PREPAY);
        booking.setServiceNameSnapshot("Prueba");
        booking.setTimezone("America/Montevideo");
        booking.setStartDateTime(LocalDateTime.of(2026, 3, 10, 9, 0));

        when(userRepository.findByIdAndDeletedAtIsNull(7L)).thenReturn(Optional.of(user));
        when(bookingRepository.findAllByUserWithDetailsOrderByStartDateTimeAsc(user)).thenReturn(List.of(booking));
        when(bookingFinanceService.findResponseMapByBookingIds(List.of(44L)))
            .thenReturn(Map.<Long, BookingFinancialSummaryResponse>of());
        when(bookingFinanceService.findLatestRefundResponseMapByBookingIds(List.of(44L)))
            .thenReturn(Map.<Long, BookingRefundRecordResponse>of());
        when(bookingFinanceService.findLatestPayoutResponseMapByBookingIds(List.of(44L)))
            .thenReturn(Map.<Long, BookingPayoutRecordResponse>of());
        when(bookingClientProfessionalViewGateway.resolveView(booking))
            .thenReturn(new BookingClientProfessionalView("svc-1", "Profesional Test", "pro-test", "Montevideo"));
        when(bookingDateTimeService.toUtcString(booking)).thenReturn("2026-03-10T12:00:00Z");
        when(bookingPolicySnapshotService.resolveForBooking(booking)).thenReturn(null);
        when(bookingPolicySnapshotService.toResponse((ResolvedBookingPolicy) null)).thenReturn(null);

        List<?> result = service.getBookings("7");

        assertEquals(1, result.size());
    }
}
