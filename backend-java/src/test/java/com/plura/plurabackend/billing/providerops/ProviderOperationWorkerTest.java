package com.plura.plurabackend.core.billing.providerops;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.core.billing.providerops.model.ProviderOperation;
import com.plura.plurabackend.core.billing.providerops.model.ProviderOperationStatus;
import com.plura.plurabackend.core.billing.providerops.model.ProviderOperationType;
import com.plura.plurabackend.core.booking.finance.BookingProviderIntegrationService;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class ProviderOperationWorkerTest {

    private final ProviderOperationService providerOperationService = Mockito.mock(ProviderOperationService.class);
    private final BookingProviderIntegrationService bookingProviderIntegrationService = Mockito.mock(BookingProviderIntegrationService.class);

    @Test
    void shouldReplayOperationWhenRequeueSucceeds() {
        ProviderOperationWorker worker = new ProviderOperationWorker(
            providerOperationService,
            bookingProviderIntegrationService,
            10,
            120,
            30,
            10
        );
        ProviderOperation operation = operation("op-1", ProviderOperationStatus.PROCESSING);
        operation.setAttemptCount(1);

        when(providerOperationService.requeueOperation("op-1", "manual_replay")).thenReturn(true);
        when(providerOperationService.claimOperation(anyString(), anyString(), any())).thenReturn(operation);

        boolean processed = worker.replayOperationAsync("op-1", "manual_replay").join();

        assertTrue(processed);
        verify(providerOperationService).requeueOperation("op-1", "manual_replay");
        verify(providerOperationService).claimOperation(anyString(), anyString(), any(LocalDateTime.class));
        verify(bookingProviderIntegrationService).processClaimedProviderOperation("op-1");
    }

    @Test
    void shouldSkipReplayWhenRequeueIsRejected() {
        ProviderOperationWorker worker = new ProviderOperationWorker(
            providerOperationService,
            bookingProviderIntegrationService,
            10,
            120,
            30,
            10
        );
        when(providerOperationService.requeueOperation("op-2", "active_lease")).thenReturn(false);

        boolean processed = worker.replayOperationAsync("op-2", "active_lease").join();

        assertFalse(processed);
        verify(providerOperationService, never()).claimOperation(anyString(), anyString(), any());
        verify(bookingProviderIntegrationService, never()).processClaimedProviderOperation(anyString());
    }

    @Test
    void shouldAwaitDurableOperationStateInsteadOfReturningProcessingImmediately() {
        ProviderOperationWorker worker = new ProviderOperationWorker(
            providerOperationService,
            bookingProviderIntegrationService,
            10,
            120,
            30,
            10
        );
        AtomicInteger reads = new AtomicInteger();
        when(providerOperationService.getRequired("op-3")).thenAnswer(invocation -> {
            int currentRead = reads.incrementAndGet();
            if (currentRead < 3) {
                return operation("op-3", ProviderOperationStatus.PROCESSING);
            }
            return operation("op-3", ProviderOperationStatus.SUCCEEDED);
        });

        ProviderOperation latest = worker.awaitOperationState("op-3", Duration.ofSeconds(1));

        assertEquals(ProviderOperationStatus.SUCCEEDED, latest.getStatus());
        assertTrue(reads.get() >= 3);
    }

    private ProviderOperation operation(String id, ProviderOperationStatus status) {
        ProviderOperation operation = new ProviderOperation();
        operation.setId(id);
        operation.setStatus(status);
        operation.setOperationType(ProviderOperationType.BOOKING_CHECKOUT);
        operation.setExternalReference("booking:10");
        operation.setAttemptCount(1);
        return operation;
    }
}
