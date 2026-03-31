package com.plura.plurabackend.core.review.repository;

import com.plura.plurabackend.core.review.model.BookingReviewReminder;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingReviewReminderRepository extends JpaRepository<BookingReviewReminder, Long> {
    Optional<BookingReviewReminder> findByBooking_Id(Long bookingId);
}
