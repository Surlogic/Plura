package com.plura.plurabackend.booking.repository;

import com.plura.plurabackend.booking.dto.ProfessionalBookingResponse;
import com.plura.plurabackend.booking.model.Booking;
import com.plura.plurabackend.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.user.model.User;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    @Query(
        """
        SELECT b
        FROM Booking b
        JOIN FETCH b.user u
        JOIN FETCH b.professional p
        JOIN FETCH p.user pu
        JOIN FETCH b.service s
        WHERE b.id = :bookingId
        """
    )
    Optional<Booking> findDetailedById(@Param("bookingId") Long bookingId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query(
        """
        SELECT b
        FROM Booking b
        JOIN FETCH b.user u
        JOIN FETCH b.professional p
        JOIN FETCH p.user pu
        JOIN FETCH b.service s
        WHERE b.id = :bookingId
        """
    )
    Optional<Booking> findDetailedByIdForUpdate(@Param("bookingId") Long bookingId);

    List<Booking> findByIdIn(Collection<Long> bookingIds);

    boolean existsByProfessionalAndStartDateTime(
        ProfessionalProfile professional,
        LocalDateTime startDateTime
    );

    Optional<Booking> findFirstByUserAndOperationalStatusInAndStartDateTimeAfterOrderByStartDateTimeAsc(
        User user,
        List<BookingOperationalStatus> statuses,
        LocalDateTime startDateTime
    );

    List<Booking> findByUser_IdAndOperationalStatusInAndStartDateTimeGreaterThanEqual(
        Long userId,
        List<BookingOperationalStatus> statuses,
        LocalDateTime startDateTime
    );

    List<Booking> findByProfessional_IdAndOperationalStatusInAndStartDateTimeGreaterThanEqual(
        Long professionalId,
        List<BookingOperationalStatus> statuses,
        LocalDateTime startDateTime
    );

    @Query(
        """
        SELECT b
        FROM Booking b
        JOIN FETCH b.service s
        JOIN FETCH b.professional p
        JOIN FETCH p.user pu
        WHERE b.user = :user
        ORDER BY b.startDateTime ASC
        """
    )
    List<Booking> findAllByUserWithDetailsOrderByStartDateTimeAsc(@Param("user") User user);

    @Query(
        """
        SELECT new com.plura.plurabackend.booking.dto.ProfessionalBookingResponse(
            b.id,
            u.id,
            u.fullName,
            s.id,
            b.serviceNameSnapshot,
            b.startDateTime,
            b.timezone,
            b.serviceDurationSnapshot,
            b.servicePostBufferMinutesSnapshot,
            b.servicePaymentTypeSnapshot,
            b.rescheduleCount,
            b.operationalStatus
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
            AND b.operationalStatus <> :excludedStatus
        """
    )
    List<LocalDateTime> findBookedStartDateTimes(
        @Param("professional") ProfessionalProfile professional,
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end,
        @Param("excludedStatus") BookingOperationalStatus excludedStatus
    );

    @Query(
        """
        SELECT b
        FROM Booking b
        JOIN FETCH b.service s
        WHERE b.professional = :professional
            AND b.startDateTime >= :start
            AND b.startDateTime <= :end
            AND b.operationalStatus <> :excludedStatus
        ORDER BY b.startDateTime ASC
        """
    )
    List<Booking> findBookedWithServiceByProfessionalAndStartDateTimeBetween(
        @Param("professional") ProfessionalProfile professional,
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end,
        @Param("excludedStatus") BookingOperationalStatus excludedStatus
    );

    @Query(
        """
        SELECT b
        FROM Booking b
        JOIN FETCH b.service s
        WHERE b.professional = :professional
            AND b.startDateTime >= :start
            AND b.startDateTime <= :end
            AND b.operationalStatus <> :excludedStatus
            AND b.id <> :excludedBookingId
        ORDER BY b.startDateTime ASC
        """
    )
    List<Booking> findBookedWithServiceByProfessionalAndStartDateTimeBetweenExcludingBooking(
        @Param("professional") ProfessionalProfile professional,
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end,
        @Param("excludedStatus") BookingOperationalStatus excludedStatus,
        @Param("excludedBookingId") Long excludedBookingId
    );

    @Query(
        """
        SELECT b
        FROM Booking b
        JOIN FETCH b.service s
        JOIN FETCH b.professional p
        WHERE p.id IN :professionalIds
            AND b.startDateTime >= :start
            AND b.startDateTime <= :end
            AND b.operationalStatus <> :excludedStatus
        ORDER BY p.id ASC, b.startDateTime ASC
        """
    )
    List<Booking> findBookedWithServiceByProfessionalIdsAndStartDateTimeBetween(
        @Param("professionalIds") Collection<Long> professionalIds,
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end,
        @Param("excludedStatus") BookingOperationalStatus excludedStatus
    );

    long countByCreatedAtGreaterThanEqualAndCreatedAtLessThanAndOperationalStatusNot(
        LocalDateTime from,
        LocalDateTime to,
        BookingOperationalStatus status
    );

    @Query(
        """
        SELECT b.professional.id, COUNT(b.id)
        FROM Booking b
        WHERE b.operationalStatus IN :statuses
        GROUP BY b.professional.id
        ORDER BY COUNT(b.id) DESC
        """
    )
    List<Object[]> findTopProfessionalIdsByStatuses(
        @Param("statuses") List<BookingOperationalStatus> statuses,
        Pageable pageable
    );
}
