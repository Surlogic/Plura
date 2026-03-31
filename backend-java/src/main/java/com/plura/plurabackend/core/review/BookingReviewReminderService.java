package com.plura.plurabackend.core.review;

import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.core.booking.repository.BookingRepository;
import com.plura.plurabackend.core.review.dto.ReviewReminderResponse;
import com.plura.plurabackend.core.review.dto.ReviewReminderShownResponse;
import com.plura.plurabackend.core.review.model.BookingReviewReminder;
import com.plura.plurabackend.core.review.repository.BookingReviewReminderRepository;
import com.plura.plurabackend.core.review.repository.BookingReviewRepository;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BookingReviewReminderService {

    private static final int REMINDER_LOOKUP_LIMIT = 10;

    private final BookingRepository bookingRepository;
    private final BookingReviewRepository bookingReviewRepository;
    private final BookingReviewReminderRepository bookingReviewReminderRepository;
    private final ZoneId systemZoneId;

    public BookingReviewReminderService(
        BookingRepository bookingRepository,
        BookingReviewRepository bookingReviewRepository,
        BookingReviewReminderRepository bookingReviewReminderRepository,
        @Value("${app.timezone:America/Montevideo}") String appTimezone
    ) {
        this.bookingRepository = bookingRepository;
        this.bookingReviewRepository = bookingReviewRepository;
        this.bookingReviewReminderRepository = bookingReviewReminderRepository;
        this.systemZoneId = ZoneId.of(appTimezone);
    }

    @Transactional(readOnly = true)
    public Optional<ReviewReminderResponse> findNextReminder(Long clientUserId) {
        LocalDateTime now = LocalDateTime.now(systemZoneId);
        LocalDateTime completedAfter = now.minusDays(BookingReviewPolicy.REVIEW_WINDOW_DAYS);
        List<Booking> candidates = bookingRepository.findRecentCompletedWithoutReviewForUser(
            clientUserId,
            completedAfter,
            PageRequest.of(0, REMINDER_LOOKUP_LIMIT)
        );

        for (Booking booking : candidates) {
            BookingReviewReminder reminder = bookingReviewReminderRepository.findByBooking_Id(booking.getId()).orElse(null);
            if (!isReminderEligible(booking, reminder, now)) {
                continue;
            }
            return Optional.of(toReminderResponse(booking, reminder));
        }

        return Optional.empty();
    }

    @Transactional
    public ReviewReminderShownResponse markReminderShown(Long bookingId, Long clientUserId) {
        LocalDateTime now = LocalDateTime.now(systemZoneId);
        Booking booking = bookingRepository.findDetailedById(bookingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva no encontrada"));

        if (booking.getUser() == null || !clientUserId.equals(booking.getUser().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado");
        }
        if (bookingReviewRepository.existsByBooking_Id(bookingId)) {
            return new ReviewReminderShownResponse(false, currentReminderCount(bookingId), "BOOKING_ALREADY_REVIEWED");
        }

        BookingReviewReminder reminder = bookingReviewReminderRepository.findByBooking_Id(bookingId).orElse(null);
        if (!isReminderEligible(booking, reminder, now)) {
            return new ReviewReminderShownResponse(false, reminder == null ? 0 : safeReminderCount(reminder), resolveIneligibleReason(booking, reminder, now));
        }

        BookingReviewReminder currentReminder = reminder == null ? new BookingReviewReminder() : reminder;
        if (currentReminder.getId() == null) {
            currentReminder.setBooking(booking);
            currentReminder.setUser(booking.getUser());
            currentReminder.setReminderCount(0);
        }
        currentReminder.setReminderCount(safeReminderCount(currentReminder) + 1);
        currentReminder.setLastRemindedAt(now);

        try {
            BookingReviewReminder savedReminder = bookingReviewReminderRepository.saveAndFlush(currentReminder);
            return new ReviewReminderShownResponse(true, safeReminderCount(savedReminder), null);
        } catch (DataIntegrityViolationException exception) {
            BookingReviewReminder existingReminder = bookingReviewReminderRepository.findByBooking_Id(bookingId)
                .orElseThrow(() -> exception);
            return new ReviewReminderShownResponse(false, safeReminderCount(existingReminder), "REMINDER_ALREADY_RECORDED");
        }
    }

    private int currentReminderCount(Long bookingId) {
        return bookingReviewReminderRepository.findByBooking_Id(bookingId)
            .map(this::safeReminderCount)
            .orElse(0);
    }

    private boolean isReminderEligible(Booking booking, BookingReviewReminder reminder, LocalDateTime now) {
        if (booking.getOperationalStatus() != BookingOperationalStatus.COMPLETED) {
            return false;
        }
        if (!BookingReviewPolicy.isWithinReviewWindow(booking.getCompletedAt(), now)) {
            return false;
        }
        if (reminder != null && BookingReviewPolicy.reachedReminderLimit(reminder.getReminderCount())) {
            return false;
        }
        return reminder == null || BookingReviewPolicy.respectsReminderCadence(reminder.getLastRemindedAt(), now);
    }

    private String resolveIneligibleReason(Booking booking, BookingReviewReminder reminder, LocalDateTime now) {
        if (booking.getOperationalStatus() != BookingOperationalStatus.COMPLETED) {
            return "BOOKING_NOT_COMPLETED";
        }
        if (!BookingReviewPolicy.isWithinReviewWindow(booking.getCompletedAt(), now)) {
            return "REVIEW_WINDOW_EXPIRED";
        }
        if (reminder != null && BookingReviewPolicy.reachedReminderLimit(reminder.getReminderCount())) {
            return "REMINDER_LIMIT_REACHED";
        }
        if (reminder != null && !BookingReviewPolicy.respectsReminderCadence(reminder.getLastRemindedAt(), now)) {
            return "REMINDER_COOLDOWN_ACTIVE";
        }
        return "REMINDER_NOT_ELIGIBLE";
    }

    private ReviewReminderResponse toReminderResponse(Booking booking, BookingReviewReminder reminder) {
        return new ReviewReminderResponse(
            booking.getId(),
            firstNonBlank(booking.getProfessionalDisplayNameSnapshot(), "tu profesional"),
            firstNonBlank(booking.getServiceNameSnapshot(), "tu turno"),
            booking.getCompletedAt(),
            BookingReviewPolicy.resolveReviewWindowEndsAt(booking.getCompletedAt()),
            reminder == null ? 0 : safeReminderCount(reminder)
        );
    }

    private int safeReminderCount(BookingReviewReminder reminder) {
        return reminder.getReminderCount() == null ? 0 : Math.max(0, reminder.getReminderCount());
    }

    private String firstNonBlank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
