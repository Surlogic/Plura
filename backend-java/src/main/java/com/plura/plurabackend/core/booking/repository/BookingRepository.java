package com.plura.plurabackend.core.booking.repository;

import com.plura.plurabackend.core.booking.dto.ProfessionalBookingResponse;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.core.user.model.User;
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
        WHERE b.id = :bookingId
        """
    )
    Optional<Booking> findDetailedByIdForUpdate(@Param("bookingId") Long bookingId);

    @Query("SELECT b FROM Booking b JOIN FETCH b.user WHERE b.id IN :bookingIds")
    List<Booking> findByIdIn(@Param("bookingIds") Collection<Long> bookingIds);

    boolean existsByProfessionalIdAndStartDateTime(
        Long professionalId,
        LocalDateTime startDateTime
    );

    @Query(
        """
        SELECT b FROM Booking b JOIN FETCH b.user u
        WHERE b.user = :user
          AND b.operationalStatus IN :statuses
          AND b.startDateTime > :startDateTime
        ORDER BY b.startDateTime ASC
        LIMIT 1
        """
    )
    Optional<Booking> findNextBookingForUser(
        @Param("user") User user,
        @Param("statuses") List<BookingOperationalStatus> statuses,
        @Param("startDateTime") LocalDateTime startDateTime
    );

    List<Booking> findByUser_IdAndOperationalStatusInAndStartDateTimeGreaterThanEqual(
        Long userId,
        List<BookingOperationalStatus> statuses,
        LocalDateTime startDateTime
    );

    List<Booking> findByProfessionalIdAndOperationalStatusInAndStartDateTimeGreaterThanEqual(
        Long professionalId,
        List<BookingOperationalStatus> statuses,
        LocalDateTime startDateTime
    );

    @Query(
        """
        SELECT b
        FROM Booking b
        JOIN FETCH b.user u
        WHERE b.user = :user
        ORDER BY b.startDateTime ASC
        """
    )
    List<Booking> findAllByUserWithDetailsOrderByStartDateTimeAsc(@Param("user") User user);

    @Query(
        """
        SELECT b
        FROM Booking b
        WHERE b.user.id = :userId
          AND b.operationalStatus = com.plura.plurabackend.core.booking.model.BookingOperationalStatus.COMPLETED
          AND b.completedAt IS NOT NULL
          AND b.completedAt >= :completedAfter
          AND NOT EXISTS (
              SELECT 1
              FROM BookingReview r
              WHERE r.booking = b
          )
        ORDER BY b.completedAt DESC, b.id DESC
        """
    )
    List<Booking> findRecentCompletedWithoutReviewForUser(
        @Param("userId") Long userId,
        @Param("completedAfter") LocalDateTime completedAfter,
        Pageable pageable
    );

    @Query(
        """
        SELECT new com.plura.plurabackend.core.booking.dto.ProfessionalBookingResponse(
            b.id,
            u.id,
            u.fullName,
            b.serviceId,
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
        WHERE b.professionalId = :professionalId
            AND b.startDateTime BETWEEN :start AND :end
        ORDER BY b.startDateTime ASC
        """
    )
    List<ProfessionalBookingResponse> findProfessionalBookingResponsesByProfessionalIdAndStartDateTimeBetween(
        @Param("professionalId") Long professionalId,
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end
    );

    @Query(
        """
        SELECT b.startDateTime
        FROM Booking b
        WHERE b.professionalId = :professionalId
            AND b.startDateTime BETWEEN :start AND :end
            AND b.operationalStatus <> :excludedStatus
        """
    )
    List<LocalDateTime> findBookedStartDateTimesByProfessionalId(
        @Param("professionalId") Long professionalId,
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end,
        @Param("excludedStatus") BookingOperationalStatus excludedStatus
    );

    @Query(
        """
        SELECT b
        FROM Booking b
        WHERE b.professionalId = :professionalId
            AND b.startDateTime >= :start
            AND b.startDateTime <= :end
            AND b.operationalStatus <> :excludedStatus
        ORDER BY b.startDateTime ASC
        """
    )
    List<Booking> findBookedWithServiceByProfessionalIdAndStartDateTimeBetween(
        @Param("professionalId") Long professionalId,
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end,
        @Param("excludedStatus") BookingOperationalStatus excludedStatus
    );

    @Query(
        """
        SELECT b
        FROM Booking b
        WHERE b.professionalId = :professionalId
            AND b.startDateTime >= :start
            AND b.startDateTime <= :end
            AND b.operationalStatus <> :excludedStatus
            AND b.id <> :excludedBookingId
        ORDER BY b.startDateTime ASC
        """
    )
    List<Booking> findBookedWithServiceByProfessionalIdAndStartDateTimeBetweenExcludingBooking(
        @Param("professionalId") Long professionalId,
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end,
        @Param("excludedStatus") BookingOperationalStatus excludedStatus,
        @Param("excludedBookingId") Long excludedBookingId
    );

    @Query(
        """
        SELECT b
        FROM Booking b
        WHERE b.professionalId IN :professionalIds
            AND b.startDateTime >= :start
            AND b.startDateTime <= :end
            AND b.operationalStatus <> :excludedStatus
        ORDER BY b.professionalId ASC, b.startDateTime ASC
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
        SELECT new com.plura.plurabackend.core.booking.dto.ProfessionalBookingResponse(
            b.id,
            u.id,
            u.fullName,
            b.serviceId,
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
        WHERE b.workerId = :workerId
            AND b.startDateTime BETWEEN :start AND :end
        ORDER BY b.startDateTime ASC
        """
    )
    List<ProfessionalBookingResponse> findWorkerBookingResponsesByWorkerIdAndStartDateTimeBetween(
        @Param("workerId") Long workerId,
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end
    );

    @Query(
        """
        SELECT b.professionalId, COUNT(b.id)
        FROM Booking b
        WHERE b.operationalStatus IN :statuses
          AND b.createdAt >= :since
        GROUP BY b.professionalId
        ORDER BY COUNT(b.id) DESC
        """
    )
    List<Object[]> findTopProfessionalIdsByStatuses(
        @Param("statuses") List<BookingOperationalStatus> statuses,
        @Param("since") LocalDateTime since,
        Pageable pageable
    );
}
