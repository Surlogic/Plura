package com.plura.plurabackend.booking.decision.repository;

import com.plura.plurabackend.booking.decision.model.BookingActionDecision;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingActionDecisionRepository extends JpaRepository<BookingActionDecision, String> {
    List<BookingActionDecision> findByBooking_IdOrderByCreatedAtDesc(Long bookingId);
}
