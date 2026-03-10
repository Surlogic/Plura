package com.plura.plurabackend.booking.application;

import com.plura.plurabackend.booking.dto.BookingFinancialSummaryResponse;
import com.plura.plurabackend.booking.dto.BookingPayoutRecordResponse;
import com.plura.plurabackend.booking.dto.BookingRefundRecordResponse;
import com.plura.plurabackend.booking.dto.ProfessionalBookingResponse;
import com.plura.plurabackend.booking.finance.BookingFinanceService;
import com.plura.plurabackend.booking.model.Booking;
import com.plura.plurabackend.booking.policy.BookingPolicySnapshotService;
import com.plura.plurabackend.booking.repository.BookingRepository;
import com.plura.plurabackend.booking.time.BookingDateTimeService;
import com.plura.plurabackend.professional.application.ProfessionalAccessSupport;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BookingQueryApplicationService {

    private final BookingRepository bookingRepository;
    private final BookingFinanceService bookingFinanceService;
    private final BookingPolicySnapshotService bookingPolicySnapshotService;
    private final BookingDateTimeService bookingDateTimeService;
    private final ProfessionalAccessSupport professionalAccessSupport;

    public BookingQueryApplicationService(
        BookingRepository bookingRepository,
        BookingFinanceService bookingFinanceService,
        BookingPolicySnapshotService bookingPolicySnapshotService,
        BookingDateTimeService bookingDateTimeService,
        ProfessionalAccessSupport professionalAccessSupport
    ) {
        this.bookingRepository = bookingRepository;
        this.bookingFinanceService = bookingFinanceService;
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

        ProfessionalProfile profile = professionalAccessSupport.loadProfessionalByUserId(rawUserId);
        List<ProfessionalBookingResponse> bookings = bookingRepository.findProfessionalBookingResponsesByProfessionalAndStartDateTimeBetween(
            profile,
            dateFrom.atStartOfDay(),
            dateTo.atTime(LocalTime.MAX)
        );

        List<Long> bookingIds = bookings.stream()
            .map(ProfessionalBookingResponse::getId)
            .filter(Objects::nonNull)
            .toList();
        Map<Long, BookingFinancialSummaryResponse> summaries = bookingFinanceService.findResponseMapByBookingIds(bookingIds);
        Map<Long, BookingRefundRecordResponse> latestRefunds = bookingFinanceService.findLatestRefundResponseMapByBookingIds(bookingIds);
        Map<Long, BookingPayoutRecordResponse> latestPayouts = bookingFinanceService.findLatestPayoutResponseMapByBookingIds(bookingIds);
        Map<Long, Booking> bookingEntities = bookingRepository.findByIdIn(bookingIds).stream()
            .collect(Collectors.toMap(Booking::getId, booking -> booking));

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

            Booking bookingEntity = bookingEntities.get(booking.getId());
            if (bookingEntity != null) {
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
}
