package com.plura.plurabackend.booking.repository;

import com.plura.plurabackend.booking.dto.ProfessionalBookingResponse;
import com.plura.plurabackend.booking.model.Booking;
import com.plura.plurabackend.booking.model.BookingStatus;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.user.model.User;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    boolean existsByProfessionalAndStartDateTime(
        ProfessionalProfile professional,
        LocalDateTime startDateTime
    );

    Optional<Booking> findFirstByUserAndStatusInAndStartDateTimeAfterOrderByStartDateTimeAsc(
        User user,
        List<BookingStatus> statuses,
        LocalDateTime startDateTime
    );

    @Query(
        """
        SELECT new com.plura.plurabackend.booking.dto.ProfessionalBookingResponse(
            b.id,
            u.id,
            u.fullName,
            s.id,
            s.name,
            b.startDateTime,
            b.status
        )
        FROM Booking b
        JOIN b.user u
        JOIN b.service s
        WHERE b.professional = :professional
            AND b.startDateTime BETWEEN :start AND :end
        ORDER BY b.startDateTime ASC
        """
    )
    List<ProfessionalBookingResponse> findProfessionalBookingResponsesByProfessionalAndStartDateTimeBetween(
        @Param("professional") ProfessionalProfile professional,
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end
    );

    @Query(
        """
        SELECT b.startDateTime
        FROM Booking b
        WHERE b.professional = :professional
            AND b.startDateTime BETWEEN :start AND :end
            AND b.status <> :excludedStatus
        """
    )
    List<LocalDateTime> findBookedStartDateTimes(
        @Param("professional") ProfessionalProfile professional,
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end,
        @Param("excludedStatus") BookingStatus excludedStatus
    );
}
