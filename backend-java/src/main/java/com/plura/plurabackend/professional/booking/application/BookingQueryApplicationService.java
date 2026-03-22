package com.plura.plurabackend.professional.booking.application;

import com.plura.plurabackend.core.booking.dto.BookingFinancialSummaryResponse;
import com.plura.plurabackend.core.booking.dto.BookingPayoutRecordResponse;
import com.plura.plurabackend.core.booking.dto.BookingRefundRecordResponse;
import com.plura.plurabackend.core.booking.dto.ProfessionalBookingResponse;
import com.plura.plurabackend.core.booking.BookingPaymentsGateway;
import com.plura.plurabackend.core.booking.finance.BookingFinanceService;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.core.booking.model.ServicePaymentType;
import com.plura.plurabackend.core.booking.policy.BookingPolicySnapshotService;
import com.plura.plurabackend.core.booking.repository.BookingRepository;
import com.plura.plurabackend.core.booking.time.BookingDateTimeService;
import com.plura.plurabackend.professional.application.ProfessionalAccessSupport;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BookingQueryApplicationService {

    private static final Logger LOGGER = LoggerFactory.getLogger(BookingQueryApplicationService.class);

    private final BookingRepository bookingRepository;
    private final BookingFinanceService bookingFinanceService;
    private final BookingPaymentsGateway bookingPaymentsGateway;
    private final BookingPolicySnapshotService bookingPolicySnapshotService;
    private final BookingDateTimeService bookingDateTimeService;
    private final ProfessionalAccessSupport professionalAccessSupport;

    public BookingQueryApplicationService(
        BookingRepository bookingRepository,
        BookingFinanceService bookingFinanceService,
        BookingPaymentsGateway bookingPaymentsGateway,
        BookingPolicySnapshotService bookingPolicySnapshotService,
        BookingDateTimeService bookingDateTimeService,
        ProfessionalAccessSupport professionalAccessSupport
    ) {
        this.bookingRepository = bookingRepository;
        this.bookingFinanceService = bookingFinanceService;
        this.bookingPaymentsGateway = bookingPaymentsGateway;
        this.bookingPolicySnapshotService = bookingPolicySnapshotService;
        this.bookingDateTimeService = bookingDateTimeService;
        this.professionalAccessSupport = professionalAccessSupport;
    }

    @Transactional(readOnly = true)
    public List<ProfessionalBookingResponse> getProfessionalBookings(
        String rawUserId,
        String rawDate,
        String rawDateFrom,
        String rawDateTo
    ) {
        LocalDate dateFrom;
        LocalDate dateTo;
        if (rawDate != null && !rawDate.isBlank()) {
            if ((rawDateFrom != null && !rawDateFrom.isBlank()) || (rawDateTo != null && !rawDateTo.isBlank())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Usá date o dateFrom/dateTo, pero no ambos");
            }
            dateFrom = parseDate(rawDate, "Formato de fecha inválido");
            dateTo = dateFrom;
        } else {
            if (rawDateFrom == null || rawDateFrom.isBlank() || rawDateTo == null || rawDateTo.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Debés enviar date o dateFrom/dateTo");
            }
            dateFrom = parseDate(rawDateFrom, "Formato de dateFrom inválido");
            dateTo = parseDate(rawDateTo, "Formato de dateTo inválido");
            if (dateTo.isBefore(dateFrom)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "dateTo debe ser mayor o igual a dateFrom");
            }
        }
        // Reservas es un listado operativo; el gating de agenda diaria/semanal vive aparte.
        ProfessionalProfile profile = professionalAccessSupport.loadProfessionalByUserId(rawUserId);
        List<ProfessionalBookingResponse> bookings = bookingRepository.findProfessionalBookingResponsesByProfessionalIdAndStartDateTimeBetween(
            profile.getId(),
            dateFrom.atStartOfDay(),
            dateTo.atTime(LocalTime.MAX)
        );

        List<Long> bookingIds = bookings.stream()
            .map(ProfessionalBookingResponse::getId)
            .filter(Objects::nonNull)
            .toList();
        Map<Long, Booking> bookingEntities = bookingRepository.findByIdIn(bookingIds).stream()
            .collect(Collectors.toMap(Booking::getId, booking -> booking));
        List<Long> pendingSyncIds = bookingEntities.values().stream()
            .filter(this::shouldSyncPendingPayment)
            .map(Booking::getId)
            .toList();
        pendingSyncIds.forEach(this::syncPendingPaymentSafely);
        if (!pendingSyncIds.isEmpty()) {
            bookingEntities = bookingRepository.findByIdIn(bookingIds).stream()
                .collect(Collectors.toMap(Booking::getId, booking -> booking));
        }
        final Map<Long, Booking> resolvedBookingEntities = bookingEntities;
        Map<Long, BookingFinancialSummaryResponse> summaries = bookingFinanceService.findResponseMapByBookingIds(bookingIds);
        Map<Long, BookingRefundRecordResponse> latestRefunds = bookingFinanceService.findLatestRefundResponseMapByBookingIds(bookingIds);
        Map<Long, BookingPayoutRecordResponse> latestPayouts = bookingFinanceService.findLatestPayoutResponseMapByBookingIds(bookingIds);

        bookings.forEach(booking -> {
            BookingFinancialSummaryResponse summary = summaries.get(booking.getId());
            BookingRefundRecordResponse latestRefund = latestRefunds.get(booking.getId());
            BookingPayoutRecordResponse latestPayout = latestPayouts.get(booking.getId());
            booking.setFinancialSummary(summary);
            booking.setPaymentStatus(summary == null ? null : summary.getFinancialStatus());
            booking.setRefundStatus(latestRefund == null ? "NONE" : latestRefund.getStatus());
            booking.setPayoutStatus(latestPayout == null ? "NONE" : latestPayout.getStatus());
            booking.setLatestRefund(latestRefund);
            booking.setLatestPayout(latestPayout);

            Booking bookingEntity = resolvedBookingEntities.get(booking.getId());
            if (bookingEntity != null) {
                booking.setStatus(bookingEntity.getOperationalStatus().name());
                booking.setStartDateTimeUtc(bookingDateTimeService.toUtcString(bookingEntity));
                booking.setPolicySnapshot(
                    bookingPolicySnapshotService.toResponse(bookingPolicySnapshotService.resolveForBooking(bookingEntity))
                );
            }
        });

        return bookings;
    }

    private LocalDate parseDate(String rawDate, String errorMessage) {
        try {
            return LocalDate.parse(rawDate.trim());
        } catch (DateTimeParseException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, errorMessage);
        }
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

    private void syncPendingPaymentSafely(Long bookingId) {
        try {
            bookingPaymentsGateway.syncPendingChargeStatus(bookingId);
        } catch (Exception exception) {
            LOGGER.warn(
                "Professional booking payment sync failed; keeping current booking snapshot bookingId={}",
                bookingId,
                exception
            );
        }
    }
}
