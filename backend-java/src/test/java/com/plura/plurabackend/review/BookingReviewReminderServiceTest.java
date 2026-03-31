package com.plura.plurabackend.review;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.core.booking.repository.BookingRepository;
import com.plura.plurabackend.core.review.BookingReviewPolicy;
import com.plura.plurabackend.core.review.BookingReviewReminderService;
import com.plura.plurabackend.core.review.dto.ReviewReminderShownResponse;
import com.plura.plurabackend.core.review.model.BookingReviewReminder;
import com.plura.plurabackend.core.review.repository.BookingReviewReminderRepository;
import com.plura.plurabackend.core.review.repository.BookingReviewRepository;
import com.plura.plurabackend.core.user.model.User;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class BookingReviewReminderServiceTest {

    private BookingRepository bookingRepository;
    private BookingReviewRepository bookingReviewRepository;
    private BookingReviewReminderRepository bookingReviewReminderRepository;
    private BookingReviewReminderService service;

    @BeforeEach
    void setUp() {
        bookingRepository = mock(BookingRepository.class);
        bookingReviewRepository = mock(BookingReviewRepository.class);
        bookingReviewReminderRepository = mock(BookingReviewReminderRepository.class);
        service = new BookingReviewReminderService(
            bookingRepository,
            bookingReviewRepository,
            bookingReviewReminderRepository,
            "America/Montevideo"
        );
    }

    @Test
    void findsNextReminderForEligibleCompletedBooking() {
        Booking booking = booking(1L, LocalDateTime.now().minusDays(1));
        when(bookingRepository.findRecentCompletedWithoutReviewForUser(any(), any(), any()))
            .thenReturn(List.of(booking));
        when(bookingReviewReminderRepository.findByBooking_Id(1L)).thenReturn(Optional.empty());

        var reminder = service.findNextReminder(10L);

        assertTrue(reminder.isPresent());
        assertEquals(1L, reminder.get().bookingId());
    }

    @Test
    void doesNotReturnReminderWhenWindowExpired() {
        Booking booking = booking(1L, LocalDateTime.now().minusDays(BookingReviewPolicy.REVIEW_WINDOW_DAYS + 1L));
        when(bookingRepository.findRecentCompletedWithoutReviewForUser(any(), any(), any()))
            .thenReturn(List.of(booking));
        when(bookingReviewReminderRepository.findByBooking_Id(1L)).thenReturn(Optional.empty());

        var reminder = service.findNextReminder(10L);

        assertTrue(reminder.isEmpty());
    }

    @Test
    void doesNotReturnReminderWhenLimitWasReached() {
        Booking booking = booking(1L, LocalDateTime.now().minusDays(1));
        BookingReviewReminder reminderState = reminderState(
            booking,
            BookingReviewPolicy.MAX_REMINDERS_PER_BOOKING,
            LocalDateTime.now().minusDays(2)
        );
        when(bookingRepository.findRecentCompletedWithoutReviewForUser(any(), any(), any()))
            .thenReturn(List.of(booking));
        when(bookingReviewReminderRepository.findByBooking_Id(1L)).thenReturn(Optional.of(reminderState));

        var reminder = service.findNextReminder(10L);

        assertTrue(reminder.isEmpty());
    }

    @Test
    void doesNotReturnReminderWhenDailyCadenceIsStillActive() {
        Booking booking = booking(1L, LocalDateTime.now().minusDays(1));
        BookingReviewReminder reminderState = reminderState(booking, 1, LocalDateTime.now().minusHours(6));
        when(bookingRepository.findRecentCompletedWithoutReviewForUser(any(), any(), any()))
            .thenReturn(List.of(booking));
        when(bookingReviewReminderRepository.findByBooking_Id(1L)).thenReturn(Optional.of(reminderState));

        var reminder = service.findNextReminder(10L);

        assertTrue(reminder.isEmpty());
    }

    @Test
    void doesNotRecordReminderIfBookingAlreadyReviewed() {
        Booking booking = booking(1L, LocalDateTime.now().minusDays(1));
        when(bookingRepository.findDetailedById(1L)).thenReturn(Optional.of(booking));
        when(bookingReviewRepository.existsByBooking_Id(1L)).thenReturn(true);
        when(bookingReviewReminderRepository.findByBooking_Id(1L)).thenReturn(Optional.empty());

        ReviewReminderShownResponse response = service.markReminderShown(1L, 10L);

        assertFalse(response.recorded());
        verify(bookingReviewReminderRepository, never()).saveAndFlush(any());
    }

    private Booking booking(Long id, LocalDateTime completedAt) {
        User user = new User();
        user.setId(10L);

        Booking booking = new Booking();
        booking.setId(id);
        booking.setUser(user);
        booking.setProfessionalDisplayNameSnapshot("Profesional Demo");
        booking.setServiceNameSnapshot("Corte");
        booking.setOperationalStatus(BookingOperationalStatus.COMPLETED);
        booking.setCompletedAt(completedAt);
        return booking;
    }

    private BookingReviewReminder reminderState(Booking booking, int count, LocalDateTime lastRemindedAt) {
        BookingReviewReminder reminder = new BookingReviewReminder();
        reminder.setId(100L);
        reminder.setBooking(booking);
        reminder.setUser(booking.getUser());
        reminder.setReminderCount(count);
        reminder.setLastRemindedAt(lastRemindedAt);
        return reminder;
    }
}
