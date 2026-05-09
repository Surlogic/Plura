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

/**
 * Tests de resenas y moderacion.
 * Cubren escenarios de reserva resena elegibilidad servicio para documentar el comportamiento esperado y evitar regresiones.
 * Mantener estos casos alineados con los contratos reales del backend cuando cambie la logica productiva.
 */
class BookingReviewEligibilityServiceTest {

    private BookingRepository bookingRepository;
    private BookingReviewRepository bookingReviewRepository;
    private BookingReviewEligibilityService service;

    /**
     * Prepara mocks, datos base o configuracion comun antes de cada caso de prueba.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @BeforeEach
    void setUp() {
        bookingRepository = mock(BookingRepository.class);
        bookingReviewRepository = mock(BookingReviewRepository.class);
        service = new BookingReviewEligibilityService(bookingRepository, bookingReviewRepository, "America/Montevideo");
    }

    /**
     * Escenario: verifica que devuelva eligible for recent completado reserva sin resena.
     * El objetivo es dejar explicita la regla que protege este test.
     */
    @Test
    void returnsEligibleForRecentCompletedBookingWithoutReview() {
        Booking booking = booking(1L, BookingOperationalStatus.COMPLETED, LocalDateTime.now().minusDays(1));
        when(bookingRepository.findDetailedById(1L)).thenReturn(Optional.of(booking));
        when(bookingReviewRepository.existsByBooking_Id(1L)).thenReturn(false);

        ReviewEligibilityResponse response = service.checkEligibility(1L, 10L);

        assertTrue(response.isEligible());
        assertFalse(response.isAlreadyReviewed());
    }

    /**
     * Escenario: verifica que devuelva ineligible cuando resena window vencido.
     * El objetivo es dejar explicita la regla que protege este test.
     */
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

    /**
     * Escenario: verifica que devuelva ineligible for non completado reserva.
     * El objetivo es dejar explicita la regla que protege este test.
     */
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
