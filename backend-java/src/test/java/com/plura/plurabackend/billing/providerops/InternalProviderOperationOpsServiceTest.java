package com.plura.plurabackend.core.billing.providerops;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.core.billing.providerops.dto.InternalProviderOperationAlertsResponse;
import com.plura.plurabackend.core.billing.providerops.model.ProviderOperation;
import com.plura.plurabackend.core.billing.providerops.model.ProviderOperationStatus;
import com.plura.plurabackend.core.billing.providerops.model.ProviderOperationType;
import com.plura.plurabackend.core.billing.providerops.repository.ProviderOperationRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.data.domain.Pageable;

class InternalProviderOperationOpsServiceTest {

    private final ProviderOperationRepository providerOperationRepository = Mockito.mock(ProviderOperationRepository.class);
    private final InternalProviderOperationOpsService service = new InternalProviderOperationOpsService(
        providerOperationRepository
    );

    @Test
    void shouldFlagAllThreeOperationalAlerts() {
        ProviderOperation staleUncertain = operation("unc-1", ProviderOperationStatus.UNCERTAIN);
        staleUncertain.setUpdatedAt(LocalDateTime.of(2026, 3, 10, 9, 0));

        ProviderOperation retryable = operation("ret-1", ProviderOperationStatus.RETRYABLE);
        retryable.setUpdatedAt(LocalDateTime.of(2026, 3, 10, 9, 5));

        ProviderOperation expiredLease = operation("proc-1", ProviderOperationStatus.PROCESSING);
        expiredLease.setLeaseUntil(LocalDateTime.of(2026, 3, 10, 9, 10));
        expiredLease.setLockedBy("worker-1");

        when(providerOperationRepository.countByStatusAndUpdatedAtBefore(eq(ProviderOperationStatus.UNCERTAIN), any()))
            .thenReturn(2L);
        when(providerOperationRepository.findByStatusAndUpdatedAtBeforeOrderByUpdatedAtAsc(
            eq(ProviderOperationStatus.UNCERTAIN),
            any(),
            any(Pageable.class)
        )).thenReturn(List.of(staleUncertain));

        when(providerOperationRepository.countByStatus(ProviderOperationStatus.RETRYABLE)).thenReturn(12L);
        when(providerOperationRepository.findByStatusOrderByUpdatedAtAsc(
            eq(ProviderOperationStatus.RETRYABLE),
            any(Pageable.class)
        )).thenReturn(List.of(retryable));

        when(providerOperationRepository.countExpiredLeases(eq(ProviderOperationStatus.PROCESSING), any()))
            .thenReturn(1L);
        when(providerOperationRepository.findExpiredLeases(
            eq(ProviderOperationStatus.PROCESSING),
            any(),
            any(Pageable.class)
        )).thenReturn(List.of(expiredLease));

        InternalProviderOperationAlertsResponse response = service.getAlerts(30, 10, 5, 5);

        assertTrue(response.staleUncertain().triggered());
        assertEquals(2L, response.staleUncertain().count());
        assertEquals("unc-1", response.staleUncertain().samples().get(0).operationId());

        assertTrue(response.excessiveRetryable().triggered());
        assertEquals(12L, response.excessiveRetryable().count());
        assertEquals("ret-1", response.excessiveRetryable().samples().get(0).operationId());

        assertTrue(response.expiredLeases().triggered());
        assertEquals(1L, response.expiredLeases().count());
        assertEquals("worker-1", response.expiredLeases().samples().get(0).lockedBy());
    }

    @Test
    void shouldSkipRetryableSamplesWhenBelowThreshold() {
        when(providerOperationRepository.countByStatusAndUpdatedAtBefore(eq(ProviderOperationStatus.UNCERTAIN), any()))
            .thenReturn(0L);
        when(providerOperationRepository.findByStatusAndUpdatedAtBeforeOrderByUpdatedAtAsc(
            eq(ProviderOperationStatus.UNCERTAIN),
            any(),
            any(Pageable.class)
        )).thenReturn(List.of());
        when(providerOperationRepository.countByStatus(ProviderOperationStatus.RETRYABLE)).thenReturn(3L);
        when(providerOperationRepository.countExpiredLeases(eq(ProviderOperationStatus.PROCESSING), any()))
            .thenReturn(0L);
        when(providerOperationRepository.findExpiredLeases(
            eq(ProviderOperationStatus.PROCESSING),
            any(),
            any(Pageable.class)
        )).thenReturn(List.of());

        InternalProviderOperationAlertsResponse response = service.getAlerts(30, 10, 5, 5);

        assertFalse(response.excessiveRetryable().triggered());
        assertTrue(response.excessiveRetryable().samples().isEmpty());
        verify(providerOperationRepository).countByStatus(ProviderOperationStatus.RETRYABLE);
    }

    private ProviderOperation operation(String id, ProviderOperationStatus status) {
        ProviderOperation operation = new ProviderOperation();
        operation.setId(id);
        operation.setStatus(status);
        operation.setOperationType(ProviderOperationType.BOOKING_CHECKOUT);
        operation.setBookingId(10L);
        operation.setExternalReference("booking:10");
        operation.setAttemptCount(2);
        operation.setUpdatedAt(LocalDateTime.of(2026, 3, 10, 10, 0));
        operation.setNextAttemptAt(LocalDateTime.of(2026, 3, 10, 10, 5));
        operation.setLastError("temporary failure");
        return operation;
    }
}
