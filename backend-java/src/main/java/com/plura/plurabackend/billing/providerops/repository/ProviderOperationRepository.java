package com.plura.plurabackend.billing.providerops.repository;

import com.plura.plurabackend.billing.providerops.model.ProviderOperation;
import com.plura.plurabackend.billing.providerops.model.ProviderOperationStatus;
import com.plura.plurabackend.billing.providerops.model.ProviderOperationType;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProviderOperationRepository extends JpaRepository<ProviderOperation, String> {

    Optional<ProviderOperation> findByOperationTypeAndExternalReference(
        ProviderOperationType operationType,
        String externalReference
    );

    @Query(
        """
        SELECT operation
        FROM ProviderOperation operation
        WHERE operation.status IN :statuses
          AND (operation.nextAttemptAt IS NULL OR operation.nextAttemptAt <= :now)
        ORDER BY operation.nextAttemptAt ASC, operation.createdAt ASC
        """
    )
    List<ProviderOperation> findDueOperations(
        Collection<ProviderOperationStatus> statuses,
        LocalDateTime now,
        Pageable pageable
    );

    @Modifying
    @Query(
        """
        UPDATE ProviderOperation operation
        SET operation.status = :processingStatus,
            operation.lockedBy = :lockedBy,
            operation.lockedAt = :now,
            operation.leaseUntil = :leaseUntil,
            operation.attemptCount = operation.attemptCount + 1,
            operation.lastAttemptAt = :now,
            operation.lastError = null,
            operation.nextAttemptAt = :leaseUntil,
            operation.updatedAt = :now
        WHERE operation.id = :operationId
          AND operation.status IN :claimableStatuses
          AND (operation.nextAttemptAt IS NULL OR operation.nextAttemptAt <= :now)
          AND (operation.leaseUntil IS NULL OR operation.leaseUntil <= :now)
        """
    )
    int claimOperation(
        @Param("operationId") String operationId,
        @Param("claimableStatuses") Collection<ProviderOperationStatus> claimableStatuses,
        @Param("processingStatus") ProviderOperationStatus processingStatus,
        @Param("lockedBy") String lockedBy,
        @Param("now") LocalDateTime now,
        @Param("leaseUntil") LocalDateTime leaseUntil
    );

    @Modifying
    @Query(
        """
        UPDATE ProviderOperation operation
        SET operation.lockedAt = :now,
            operation.leaseUntil = :leaseUntil,
            operation.nextAttemptAt = :leaseUntil,
            operation.updatedAt = :now
        WHERE operation.id = :operationId
          AND operation.status = :processingStatus
          AND operation.lockedBy = :lockedBy
          AND operation.leaseUntil IS NOT NULL
          AND operation.leaseUntil >= :now
        """
    )
    int renewLease(
        @Param("operationId") String operationId,
        @Param("processingStatus") ProviderOperationStatus processingStatus,
        @Param("lockedBy") String lockedBy,
        @Param("now") LocalDateTime now,
        @Param("leaseUntil") LocalDateTime leaseUntil
    );

    @Query(
        """
        SELECT operation
        FROM ProviderOperation operation
        WHERE operation.status IN :statuses
          AND operation.updatedAt <= :updatedBefore
        ORDER BY operation.updatedAt ASC, operation.createdAt ASC
        """
    )
    List<ProviderOperation> findAgedOperations(
        @Param("statuses") Collection<ProviderOperationStatus> statuses,
        @Param("updatedBefore") LocalDateTime updatedBefore,
        Pageable pageable
    );

    long countByStatus(ProviderOperationStatus status);

    long countByStatusAndUpdatedAtBefore(ProviderOperationStatus status, LocalDateTime updatedBefore);

    List<ProviderOperation> findByStatusOrderByUpdatedAtAsc(ProviderOperationStatus status, Pageable pageable);

    List<ProviderOperation> findByStatusAndUpdatedAtBeforeOrderByUpdatedAtAsc(
        ProviderOperationStatus status,
        LocalDateTime updatedBefore,
        Pageable pageable
    );

    @Query(
        """
        SELECT COUNT(operation)
        FROM ProviderOperation operation
        WHERE operation.status = :processingStatus
          AND operation.leaseUntil IS NOT NULL
          AND operation.leaseUntil < :leaseBefore
        """
    )
    long countExpiredLeases(
        @Param("processingStatus") ProviderOperationStatus processingStatus,
        @Param("leaseBefore") LocalDateTime leaseBefore
    );

    @Query(
        """
        SELECT operation
        FROM ProviderOperation operation
        WHERE operation.status = :processingStatus
          AND operation.leaseUntil IS NOT NULL
          AND operation.leaseUntil < :leaseBefore
        ORDER BY operation.leaseUntil ASC, operation.updatedAt ASC
        """
    )
    List<ProviderOperation> findExpiredLeases(
        @Param("processingStatus") ProviderOperationStatus processingStatus,
        @Param("leaseBefore") LocalDateTime leaseBefore,
        Pageable pageable
    );
}
