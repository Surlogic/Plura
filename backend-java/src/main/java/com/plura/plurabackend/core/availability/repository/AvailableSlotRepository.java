package com.plura.plurabackend.core.availability.repository;

import com.plura.plurabackend.core.availability.model.AvailableSlot;
import com.plura.plurabackend.core.availability.model.AvailableSlotStatus;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AvailableSlotRepository extends JpaRepository<AvailableSlot, Long> {

    @Query(
        value = """
        SELECT pg_advisory_xact_lock(:professionalId)
        """,
        nativeQuery = true
    )
    void lockProfessionalSlots(@Param("professionalId") Long professionalId);

    @Modifying
    @Query(
        """
        DELETE FROM AvailableSlot slot
        WHERE slot.professional.id = :professionalId
          AND slot.startAt >= :from
          AND slot.startAt < :to
        """
    )
    int deleteByProfessionalAndStartAtBetween(
        @Param("professionalId") Long professionalId,
        @Param("from") LocalDateTime from,
        @Param("to") LocalDateTime to
    );

    @Modifying
    @Query(
        """
        DELETE FROM AvailableSlot slot
        WHERE slot.professional.id = :professionalId
        """
    )
    int deleteByProfessionalId(@Param("professionalId") Long professionalId);

    @Modifying
    @Query(
        """
        UPDATE AvailableSlot slot
        SET slot.status = :status
        WHERE slot.professional.id = :professionalId
          AND slot.startAt = :startAt
        """
    )
    int updateStatusByProfessionalAndStartAt(
        @Param("professionalId") Long professionalId,
        @Param("startAt") LocalDateTime startAt,
        @Param("status") AvailableSlotStatus status
    );

    @Query(
        value = """
            SELECT MIN(slot.start_at)
            FROM available_slot slot
            WHERE slot.professional_id = :professionalId
              AND slot.status = 'AVAILABLE'
              AND slot.start_at >= :from
              AND slot.start_at < :to
            """,
        nativeQuery = true
    )
    Optional<LocalDateTime> findNextAvailableStartAt(
        @Param("professionalId") Long professionalId,
        @Param("from") LocalDateTime from,
        @Param("to") LocalDateTime to
    );
}
