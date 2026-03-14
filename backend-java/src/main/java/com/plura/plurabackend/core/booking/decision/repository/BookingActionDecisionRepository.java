package com.plura.plurabackend.core.booking.decision.repository;

import com.plura.plurabackend.core.booking.decision.model.BookingActionDecision;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingActionDecisionRepository extends JpaRepository<BookingActionDecision, String> {
    List<BookingActionDecision> findByBooking_IdOrderByCreatedAtDesc(Long bookingId);
}
