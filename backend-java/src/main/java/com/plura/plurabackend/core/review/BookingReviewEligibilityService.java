package com.plura.plurabackend.core.review;

import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.core.booking.repository.BookingRepository;
import com.plura.plurabackend.core.review.dto.ReviewEligibilityResponse;
import com.plura.plurabackend.core.review.repository.BookingReviewRepository;
import java.time.LocalDateTime;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BookingReviewEligibilityService {

    private final BookingRepository bookingRepository;
    private final BookingReviewRepository bookingReviewRepository;
    private final ZoneId systemZoneId;

    public BookingReviewEligibilityService(
        BookingRepository bookingRepository,
        BookingReviewRepository bookingReviewRepository,
        @Value("${app.timezone:America/Montevideo}") String appTimezone
    ) {
        this.bookingRepository = bookingRepository;
        this.bookingReviewRepository = bookingReviewRepository;
        this.systemZoneId = ZoneId.of(appTimezone);
    }

    public ReviewEligibilityResponse checkEligibility(Long bookingId, Long clientUserId) {
        Booking booking = bookingRepository.findDetailedById(bookingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva no encontrada"));

        if (booking.getUser() == null || !clientUserId.equals(booking.getUser().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado");
        }

        boolean alreadyReviewed = bookingReviewRepository.existsByBooking_Id(bookingId);
        if (alreadyReviewed) {
            return new ReviewEligibilityResponse(false, true, "Ya dejaste una reseña para esta reserva.");
        }

        if (booking.getOperationalStatus() != BookingOperationalStatus.COMPLETED) {
            return new ReviewEligibilityResponse(false, false,
                "Solo se pueden reseñar reservas completadas.");
        }
        LocalDateTime now = LocalDateTime.now(systemZoneId);
        if (!BookingReviewPolicy.isWithinReviewWindow(booking.getCompletedAt(), now)) {
            return new ReviewEligibilityResponse(false, false,
                "La ventana para dejar una reseña ya venció.");
        }

        return new ReviewEligibilityResponse(true, false, null);
    }
}
