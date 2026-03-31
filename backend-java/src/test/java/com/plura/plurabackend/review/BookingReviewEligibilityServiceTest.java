package com.plura.plurabackend.review;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.core.booking.repository.BookingRepository;
import com.plura.plurabackend.core.review.BookingReviewEligibilityService;
import com.plura.plurabackend.core.review.BookingReviewPolicy;
import com.plura.plurabackend.core.review.dto.ReviewEligibilityResponse;
import com.plura.plurabackend.core.review.repository.BookingReviewRepository;
import com.plura.plurabackend.core.user.model.User;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class BookingReviewEligibilityServiceTest {

    private BookingRepository bookingRepository;
    private BookingReviewRepository bookingReviewRepository;
    private BookingReviewEligibilityService service;

    @BeforeEach
    void setUp() {
        bookingRepository = mock(BookingRepository.class);
        bookingReviewRepository = mock(BookingReviewRepository.class);
        service = new BookingReviewEligibilityService(bookingRepository, bookingReviewRepository, "America/Montevideo");
    }

    @Test
    void returnsEligibleForRecentCompletedBookingWithoutReview() {
        Booking booking = booking(1L, BookingOperationalStatus.COMPLETED, LocalDateTime.now().minusDays(1));
        when(bookingRepository.findDetailedById(1L)).thenReturn(Optional.of(booking));
        when(bookingReviewRepository.existsByBooking_Id(1L)).thenReturn(false);

        ReviewEligibilityResponse response = service.checkEligibility(1L, 10L);

        assertTrue(response.isEligible());
        assertFalse(response.isAlreadyReviewed());
    }

    @Test
    void returnsIneligibleWhenReviewWindowExpired() {
        Booking booking = booking(
            1L,
            BookingOperationalStatus.COMPLETED,
            LocalDateTime.now().minusDays(BookingReviewPolicy.REVIEW_WINDOW_DAYS + 1L)
        );
        when(bookingRepository.findDetailedById(1L)).thenReturn(Optional.of(booking));
        when(bookingReviewRepository.existsByBooking_Id(1L)).thenReturn(false);

        ReviewEligibilityResponse response = service.checkEligibility(1L, 10L);

        assertFalse(response.isEligible());
        assertFalse(response.isAlreadyReviewed());
    }

    @Test
    void returnsIneligibleForNonCompletedBooking() {
        Booking booking = booking(1L, BookingOperationalStatus.CONFIRMED, null);
        when(bookingRepository.findDetailedById(1L)).thenReturn(Optional.of(booking));
        when(bookingReviewRepository.existsByBooking_Id(1L)).thenReturn(false);

        ReviewEligibilityResponse response = service.checkEligibility(1L, 10L);

        assertFalse(response.isEligible());
        assertFalse(response.isAlreadyReviewed());
    }

    private Booking booking(Long id, BookingOperationalStatus status, LocalDateTime completedAt) {
        User user = new User();
        user.setId(10L);

        Booking booking = new Booking();
        booking.setId(id);
        booking.setUser(user);
        booking.setOperationalStatus(status);
        booking.setCompletedAt(completedAt);
        return booking;
    }
}
