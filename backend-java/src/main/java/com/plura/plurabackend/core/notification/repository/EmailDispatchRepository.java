package com.plura.plurabackend.core.notification.repository;

import com.plura.plurabackend.core.notification.model.EmailDispatch;
import com.plura.plurabackend.core.notification.model.EmailDispatchStatus;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EmailDispatchRepository extends JpaRepository<EmailDispatch, String> {

    Optional<EmailDispatch> findByNotificationEvent_Id(String notificationEventId);

    long countByStatus(EmailDispatchStatus status);

    @Query(
        """
        SELECT dispatch
        FROM EmailDispatch dispatch
        JOIN FETCH dispatch.notificationEvent
        WHERE dispatch.id = :dispatchId
        """
    )
    Optional<EmailDispatch> findDetailedById(@Param("dispatchId") String dispatchId);

    @Query(
        """
        SELECT dispatch
        FROM EmailDispatch dispatch
        WHERE dispatch.status IN :statuses
          AND (dispatch.nextAttemptAt IS NULL OR dispatch.nextAttemptAt <= :now)
          AND (dispatch.leaseUntil IS NULL OR dispatch.leaseUntil <= :now)
        ORDER BY dispatch.nextAttemptAt ASC, dispatch.createdAt ASC
        """
    )
    List<EmailDispatch> findDueDispatches(
        @Param("statuses") Collection<EmailDispatchStatus> statuses,
        @Param("now") LocalDateTime now,
        Pageable pageable
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(
        """
        UPDATE EmailDispatch dispatch
        SET dispatch.status = :processingStatus,
            dispatch.lockedBy = :lockedBy,
            dispatch.lockedAt = :now,
            dispatch.leaseUntil = :leaseUntil,
            dispatch.attemptCount = dispatch.attemptCount + 1,
            dispatch.lastAttemptAt = :now,
            dispatch.errorCode = null,
            dispatch.errorMessage = null,
            dispatch.nextAttemptAt = :leaseUntil
        WHERE dispatch.id = :dispatchId
          AND dispatch.status IN :claimableStatuses
          AND (dispatch.nextAttemptAt IS NULL OR dispatch.nextAttemptAt <= :now)
          AND (dispatch.leaseUntil IS NULL OR dispatch.leaseUntil <= :now)
        """
    )
    int claimDispatch(
        @Param("dispatchId") String dispatchId,
        @Param("claimableStatuses") Collection<EmailDispatchStatus> claimableStatuses,
        @Param("processingStatus") EmailDispatchStatus processingStatus,
        @Param("lockedBy") String lockedBy,
        @Param("now") LocalDateTime now,
        @Param("leaseUntil") LocalDateTime leaseUntil
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(
        """
        UPDATE EmailDispatch dispatch
        SET dispatch.lockedAt = :now,
            dispatch.leaseUntil = :leaseUntil,
            dispatch.nextAttemptAt = :leaseUntil
        WHERE dispatch.id = :dispatchId
          AND dispatch.status = :processingStatus
          AND dispatch.lockedBy = :lockedBy
          AND dispatch.leaseUntil IS NOT NULL
          AND dispatch.leaseUntil >= :now
        """
    )
    int renewLease(
        @Param("dispatchId") String dispatchId,
        @Param("processingStatus") EmailDispatchStatus processingStatus,
        @Param("lockedBy") String lockedBy,
        @Param("now") LocalDateTime now,
        @Param("leaseUntil") LocalDateTime leaseUntil
    );
}
