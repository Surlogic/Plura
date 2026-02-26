package com.plura.plurabackend.booking.repository;

import com.plura.plurabackend.booking.model.Booking;
import com.plura.plurabackend.booking.model.BookingStatus;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.user.model.User;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
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

    Optional<Booking> findFirstByUserAndStatusInAndStartDateTimeAfterOrderByStartDateTimeAsc(
        User user,
        List<BookingStatus> statuses,
        LocalDateTime startDateTime
    );
}
