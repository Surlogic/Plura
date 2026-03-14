package com.plura.plurabackend.core.billing.providerops;

import com.plura.plurabackend.core.billing.providerops.dto.InternalProviderOperationAlertResponse;
import com.plura.plurabackend.core.billing.providerops.dto.InternalProviderOperationAlertsResponse;
import com.plura.plurabackend.core.billing.providerops.dto.InternalProviderOperationIssueResponse;
import com.plura.plurabackend.core.billing.providerops.model.ProviderOperation;
import com.plura.plurabackend.core.billing.providerops.model.ProviderOperationStatus;
import com.plura.plurabackend.core.billing.providerops.repository.ProviderOperationRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InternalProviderOperationOpsService {

    private final ProviderOperationRepository providerOperationRepository;

    public InternalProviderOperationOpsService(ProviderOperationRepository providerOperationRepository) {
        this.providerOperationRepository = providerOperationRepository;
    }

    @Transactional(readOnly = true)
    public InternalProviderOperationAlertsResponse getAlerts(
        long uncertainOlderThanMinutes,
        long retryableThreshold,
        long leaseExpiredGraceMinutes,
        int sampleLimit
    ) {
        int normalizedSampleLimit = Math.max(1, sampleLimit);
        LocalDateTime now = LocalDateTime.now();

        LocalDateTime uncertainCutoff = now.minusMinutes(Math.max(1L, uncertainOlderThanMinutes));
        long staleUncertainCount = providerOperationRepository.countByStatusAndUpdatedAtBefore(
            ProviderOperationStatus.UNCERTAIN,
            uncertainCutoff
        );
        List<InternalProviderOperationIssueResponse> staleUncertainSamples = providerOperationRepository
            .findByStatusAndUpdatedAtBeforeOrderByUpdatedAtAsc(
                ProviderOperationStatus.UNCERTAIN,
                uncertainCutoff,
                PageRequest.of(0, normalizedSampleLimit)
            ).stream()
            .map(this::toIssue)
            .toList();

        long normalizedRetryableThreshold = Math.max(0L, retryableThreshold);
        long retryableCount = providerOperationRepository.countByStatus(ProviderOperationStatus.RETRYABLE);
        List<InternalProviderOperationIssueResponse> retryableSamples = retryableCount > normalizedRetryableThreshold
            ? providerOperationRepository.findByStatusOrderByUpdatedAtAsc(
                ProviderOperationStatus.RETRYABLE,
                PageRequest.of(0, normalizedSampleLimit)
            ).stream().map(this::toIssue).toList()
            : List.of();

        LocalDateTime expiredLeaseCutoff = now.minusMinutes(Math.max(0L, leaseExpiredGraceMinutes));
        long expiredLeaseCount = providerOperationRepository.countExpiredLeases(
            ProviderOperationStatus.PROCESSING,
            expiredLeaseCutoff
        );
        List<InternalProviderOperationIssueResponse> expiredLeaseSamples = providerOperationRepository
            .findExpiredLeases(
                ProviderOperationStatus.PROCESSING,
                expiredLeaseCutoff,
                PageRequest.of(0, normalizedSampleLimit)
            ).stream()
            .map(this::toIssue)
            .toList();

        return new InternalProviderOperationAlertsResponse(
            new InternalProviderOperationAlertResponse(
                "STALE_UNCERTAIN",
                staleUncertainCount > 0,
                staleUncertainCount,
                Math.max(1L, uncertainOlderThanMinutes),
                "Operaciones UNCERTAIN sin cambios recientes",
                staleUncertainSamples
            ),
            new InternalProviderOperationAlertResponse(
                "EXCESSIVE_RETRYABLE",
                retryableCount > normalizedRetryableThreshold,
                retryableCount,
                normalizedRetryableThreshold,
                "Cantidad de operaciones RETRYABLE por encima del umbral",
                retryableSamples
            ),
            new InternalProviderOperationAlertResponse(
                "EXPIRED_LEASES",
                expiredLeaseCount > 0,
                expiredLeaseCount,
                Math.max(0L, leaseExpiredGraceMinutes),
                "Operaciones en PROCESSING con lease vencido",
                expiredLeaseSamples
            )
        );
    }

    private InternalProviderOperationIssueResponse toIssue(ProviderOperation operation) {
        return new InternalProviderOperationIssueResponse(
            operation.getId(),
            operation.getOperationType() == null ? null : operation.getOperationType().name(),
            operation.getStatus() == null ? null : operation.getStatus().name(),
            operation.getBookingId(),
            operation.getExternalReference(),
            operation.getAttemptCount(),
            operation.getLockedBy(),
            operation.getUpdatedAt(),
            operation.getNextAttemptAt(),
            operation.getLeaseUntil(),
            operation.getLastError()
        );
    }
}
