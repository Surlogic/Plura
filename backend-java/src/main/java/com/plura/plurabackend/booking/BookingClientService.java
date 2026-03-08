package com.plura.plurabackend.booking;

import com.plura.plurabackend.booking.dto.BookingFinancialSummaryResponse;
import com.plura.plurabackend.booking.dto.ClientNextBookingResponse;
import com.plura.plurabackend.booking.finance.BookingFinanceService;
import com.plura.plurabackend.booking.model.Booking;
import com.plura.plurabackend.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.booking.repository.BookingRepository;
import com.plura.plurabackend.user.model.User;
import com.plura.plurabackend.user.model.UserRole;
import com.plura.plurabackend.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BookingClientService {

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final BookingFinanceService bookingFinanceService;
    private final ZoneId systemZoneId;

    public BookingClientService(
        BookingRepository bookingRepository,
        UserRepository userRepository,
        BookingFinanceService bookingFinanceService,
        @Value("${app.timezone:America/Montevideo}") String appTimezone
    ) {
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.bookingFinanceService = bookingFinanceService;
        this.systemZoneId = ZoneId.of(appTimezone);
    }

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
        ).map(booking -> mapClientBooking(
            booking,
            bookingFinanceService.findResponseMapByBookingIds(List.of(booking.getId()))
        ));
    }

    public List<ClientNextBookingResponse> getBookings(String rawUserId) {
        User user = resolveClientUser(rawUserId);
        List<Booking> bookings = bookingRepository.findAllByUserWithDetailsOrderByStartDateTimeAsc(user);
        Map<Long, BookingFinancialSummaryResponse> summaries = bookingFinanceService.findResponseMapByBookingIds(
            bookings.stream().map(Booking::getId).toList()
        );
        return bookings
            .stream()
            .map(booking -> mapClientBooking(booking, summaries))
            .toList();
    }

    private ClientNextBookingResponse mapClientBooking(
        Booking booking,
        Map<Long, BookingFinancialSummaryResponse> financialSummaries
    ) {
        return new ClientNextBookingResponse(
            booking.getId(),
            booking.getOperationalStatus().name(),
            booking.getStartDateTime().toString(),
            booking.getTimezone(),
            booking.getService() == null ? null : booking.getService().getId(),
            booking.getServiceNameSnapshot(),
            booking.getServicePaymentTypeSnapshot() == null ? null : booking.getServicePaymentTypeSnapshot().name(),
            financialSummaries.get(booking.getId()),
            booking.getProfessional().getUser().getFullName(),
            booking.getProfessional().getSlug(),
            booking.getProfessional().getLocation()
        );
    }

    private User resolveClientUser(String rawUserId) {
        Long userId = parseUserId(rawUserId);
        User user = userRepository.findByIdAndDeletedAtIsNull(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));

        if (user.getRole() != UserRole.USER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo clientes");
        }

        return user;
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
}
