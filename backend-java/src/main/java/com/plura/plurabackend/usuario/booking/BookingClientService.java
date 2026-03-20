package com.plura.plurabackend.usuario.booking;

import com.plura.plurabackend.core.booking.BookingPaymentsGateway;
import com.plura.plurabackend.core.booking.bridge.BookingClientProfessionalView;
import com.plura.plurabackend.core.booking.bridge.BookingClientProfessionalViewGateway;
import com.plura.plurabackend.core.booking.dto.BookingFinancialSummaryResponse;
import com.plura.plurabackend.core.booking.dto.BookingPayoutRecordResponse;
import com.plura.plurabackend.core.booking.dto.BookingRefundRecordResponse;
import com.plura.plurabackend.core.booking.dto.ClientNextBookingResponse;
import com.plura.plurabackend.core.booking.finance.BookingFinanceService;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.core.booking.model.ServicePaymentType;
import com.plura.plurabackend.core.booking.policy.BookingPolicySnapshotService;
import com.plura.plurabackend.core.booking.repository.BookingRepository;
import com.plura.plurabackend.core.booking.time.BookingDateTimeService;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.model.UserRole;
import com.plura.plurabackend.core.user.repository.UserRepository;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BookingClientService {

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final BookingFinanceService bookingFinanceService;
    private final BookingPaymentsGateway bookingPaymentsGateway;
    private final BookingPolicySnapshotService bookingPolicySnapshotService;
    private final BookingDateTimeService bookingDateTimeService;
    private final BookingClientProfessionalViewGateway bookingClientProfessionalViewGateway;
    private final ZoneId systemZoneId;
    private final MeterRegistry meterRegistry;
    private final Timer clientBookingsTimer;

    public BookingClientService(
        BookingRepository bookingRepository,
        UserRepository userRepository,
        BookingFinanceService bookingFinanceService,
        BookingPaymentsGateway bookingPaymentsGateway,
        BookingPolicySnapshotService bookingPolicySnapshotService,
        BookingDateTimeService bookingDateTimeService,
        BookingClientProfessionalViewGateway bookingClientProfessionalViewGateway,
        MeterRegistry meterRegistry,
        @Value("${app.timezone:America/Montevideo}") String appTimezone
    ) {
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.bookingFinanceService = bookingFinanceService;
        this.bookingPaymentsGateway = bookingPaymentsGateway;
        this.bookingPolicySnapshotService = bookingPolicySnapshotService;
        this.bookingDateTimeService = bookingDateTimeService;
        this.bookingClientProfessionalViewGateway = bookingClientProfessionalViewGateway;
        this.meterRegistry = meterRegistry;
        this.systemZoneId = ZoneId.of(appTimezone);
        this.clientBookingsTimer = Timer.builder("plura.client_bookings.duration")
            .description("Client bookings response duration")
            .publishPercentileHistogram()
            .register(meterRegistry);
    }

    @Transactional(readOnly = true)
    public Optional<ClientNextBookingResponse> getNextBooking(String rawUserId) {
        User user = resolveClientUser(rawUserId);

        LocalDateTime now = ZonedDateTime.now(systemZoneId).toLocalDateTime();
        List<BookingOperationalStatus> activeStatuses = List.of(
            BookingOperationalStatus.PENDING,
            BookingOperationalStatus.CONFIRMED
        );

        return bookingRepository.findFirstByUserAndOperationalStatusInAndStartDateTimeAfterOrderByStartDateTimeAsc(
            user,
            activeStatuses,
            now
        ).map(booking -> {
            Booking currentBooking = booking;
            if (shouldSyncPendingPayment(booking)) {
                bookingPaymentsGateway.syncPendingChargeStatus(booking.getId());
                currentBooking = bookingRepository.findDetailedById(booking.getId()).orElse(booking);
            }
            Map<Long, BookingFinancialSummaryResponse> summaries = bookingFinanceService.findResponseMapByBookingIds(
                List.of(currentBooking.getId())
            );
            Map<Long, BookingRefundRecordResponse> latestRefunds =
                bookingFinanceService.findLatestRefundResponseMapByBookingIds(List.of(currentBooking.getId()));
            Map<Long, BookingPayoutRecordResponse> latestPayouts =
                bookingFinanceService.findLatestPayoutResponseMapByBookingIds(List.of(currentBooking.getId()));
            return mapClientBooking(
                currentBooking,
                summaries,
                latestRefunds,
                latestPayouts
            );
        });
    }

    @Transactional(readOnly = true)
    public List<ClientNextBookingResponse> getBookings(String rawUserId) {
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            User user = resolveClientUser(rawUserId);
            List<Booking> bookings = refreshBookingsAfterPendingPaymentSync(
                bookingRepository.findAllByUserWithDetailsOrderByStartDateTimeAsc(user)
            );
            List<Long> bookingIds = bookings.stream().map(Booking::getId).toList();
            Map<Long, BookingFinancialSummaryResponse> summaries = bookingFinanceService.findResponseMapByBookingIds(bookingIds);
            Map<Long, BookingRefundRecordResponse> latestRefunds =
                bookingFinanceService.findLatestRefundResponseMapByBookingIds(bookingIds);
            Map<Long, BookingPayoutRecordResponse> latestPayouts =
                bookingFinanceService.findLatestPayoutResponseMapByBookingIds(bookingIds);
            return bookings
                .stream()
                .map(booking -> mapClientBooking(booking, summaries, latestRefunds, latestPayouts))
                .toList();
        } finally {
            sample.stop(clientBookingsTimer);
        }
    }

    private ClientNextBookingResponse mapClientBooking(
        Booking booking,
        Map<Long, BookingFinancialSummaryResponse> financialSummaries,
        Map<Long, BookingRefundRecordResponse> latestRefunds,
        Map<Long, BookingPayoutRecordResponse> latestPayouts
    ) {
        BookingClientProfessionalView professionalView = bookingClientProfessionalViewGateway.resolveView(booking);
        BookingFinancialSummaryResponse financialSummary = financialSummaries.get(booking.getId());
        BookingRefundRecordResponse latestRefund = latestRefunds.get(booking.getId());
        BookingPayoutRecordResponse latestPayout = latestPayouts.get(booking.getId());
        return new ClientNextBookingResponse(
            booking.getId(),
            booking.getOperationalStatus().name(),
            booking.getStartDateTime().toString(),
            bookingDateTimeService.toUtcString(booking),
            booking.getTimezone(),
            professionalView.serviceId(),
            booking.getServiceNameSnapshot(),
            booking.getServicePaymentTypeSnapshot() == null ? null : booking.getServicePaymentTypeSnapshot().name(),
            financialSummary == null ? null : financialSummary.getFinancialStatus(),
            latestRefund == null ? "NONE" : latestRefund.getStatus(),
            latestPayout == null ? "NONE" : latestPayout.getStatus(),
            financialSummary,
            latestRefund,
            latestPayout,
            bookingPolicySnapshotService.toResponse(bookingPolicySnapshotService.resolveForBooking(booking)),
            professionalView.professionalDisplayName(),
            professionalView.professionalSlug(),
            professionalView.professionalLocation()
        );
    }

    private User resolveClientUser(String rawUserId) {
        Long userId = parseUserId(rawUserId);
        User user = userRepository.findByIdAndDeletedAtIsNull(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));

        ensureClientUser(user);
        return user;
    }

    private void ensureClientUser(User user) {
        if (user.getRole() != UserRole.USER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo clientes");
        }
    }

    private Long parseUserId(String rawUserId) {
        if (rawUserId == null || rawUserId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No autenticado");
        }
        try {
            return Long.parseLong(rawUserId.trim());
        } catch (NumberFormatException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token invalido");
        }
    }

    private List<Booking> refreshBookingsAfterPendingPaymentSync(List<Booking> bookings) {
        if (bookings == null || bookings.isEmpty()) {
            return List.of();
        }
        return bookings.stream()
            .map(booking -> {
                if (!shouldSyncPendingPayment(booking)) {
                    return booking;
                }
                bookingPaymentsGateway.syncPendingChargeStatus(booking.getId());
                return bookingRepository.findDetailedById(booking.getId()).orElse(booking);
            })
            .toList();
    }

    private boolean shouldSyncPendingPayment(Booking booking) {
        if (booking == null || booking.getId() == null) {
            return false;
        }
        if (booking.getServicePaymentTypeSnapshot() == null || booking.getServicePaymentTypeSnapshot() == ServicePaymentType.ON_SITE) {
            return false;
        }
        return booking.getOperationalStatus() == BookingOperationalStatus.PENDING
            || booking.getOperationalStatus() == BookingOperationalStatus.CONFIRMED;
    }
}
