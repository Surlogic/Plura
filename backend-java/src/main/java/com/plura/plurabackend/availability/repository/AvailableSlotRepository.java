package com.plura.plurabackend.availability.repository;

import com.plura.plurabackend.availability.model.AvailableSlot;
import com.plura.plurabackend.availability.model.AvailableSlotStatus;
import java.time.LocalDateTime;
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
}
