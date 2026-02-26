package com.plura.plurabackend.booking.repository;

import com.plura.plurabackend.booking.model.Booking;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByProfessionalAndStartDateTimeBetween(
        ProfessionalProfile professional,
        LocalDateTime start,
        LocalDateTime end
    );

    List<Booking> findByProfessionalAndStartDateTimeBetweenOrderByStartDateTimeAsc(
        ProfessionalProfile professional,
        LocalDateTime start,
        LocalDateTime end
    );

    boolean existsByProfessionalAndStartDateTime(
        ProfessionalProfile professional,
        LocalDateTime startDateTime
    );
}
