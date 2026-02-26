package com.plura.plurabackend.booking;

import com.plura.plurabackend.booking.dto.ClientNextBookingResponse;
import com.plura.plurabackend.booking.model.Booking;
import com.plura.plurabackend.booking.model.BookingStatus;
import com.plura.plurabackend.booking.repository.BookingRepository;
import com.plura.plurabackend.user.model.User;
import com.plura.plurabackend.user.model.UserRole;
import com.plura.plurabackend.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BookingClientService {

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final ZoneId systemZoneId;

    public BookingClientService(
        BookingRepository bookingRepository,
        UserRepository userRepository,
        @Value("${app.timezone:America/Montevideo}") String appTimezone
    ) {
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.systemZoneId = ZoneId.of(appTimezone);
    }

    public Optional<ClientNextBookingResponse> getNextBooking(String rawUserId) {
        Long userId = parseUserId(rawUserId);
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));

        if (user.getRole() != UserRole.USER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo clientes");
        }

        LocalDateTime now = ZonedDateTime.now(systemZoneId).toLocalDateTime();
        List<BookingStatus> activeStatuses = List.of(BookingStatus.PENDING, BookingStatus.CONFIRMED);

        return bookingRepository.findFirstByUserAndStatusInAndStartDateTimeAfterOrderByStartDateTimeAsc(
            user,
            activeStatuses,
            now
        ).map(this::mapNextBooking);
    }

    private ClientNextBookingResponse mapNextBooking(Booking booking) {
        return new ClientNextBookingResponse(
            booking.getId(),
            booking.getStatus().name(),
            booking.getStartDateTime().toString(),
            booking.getService().getName(),
            booking.getProfessional().getUser().getFullName(),
            booking.getProfessional().getSlug(),
            booking.getProfessional().getLocation()
        );
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
