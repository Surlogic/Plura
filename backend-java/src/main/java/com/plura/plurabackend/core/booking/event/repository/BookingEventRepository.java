package com.plura.plurabackend.core.booking.event.repository;

import com.plura.plurabackend.core.booking.event.model.BookingEvent;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingEventRepository extends JpaRepository<BookingEvent, String> {
    List<BookingEvent> findByBooking_IdOrderByCreatedAtDesc(Long bookingId);
}
