package com.plura.plurabackend.core.billing.providerops;

import com.plura.plurabackend.core.billing.providerops.model.ProviderOperation;
import com.plura.plurabackend.core.billing.providerops.model.ProviderOperationStatus;
import com.plura.plurabackend.core.booking.finance.BookingProviderIntegrationService;
import jakarta.annotation.PreDestroy;
import java.lang.management.ManagementFactory;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ProviderOperationWorker {

    private static final Logger LOGGER = LoggerFactory.getLogger(ProviderOperationWorker.class);

    private final ProviderOperationService providerOperationService;
    private final BookingProviderIntegrationService bookingProviderIntegrationService;
    private final int batchSize;
    private final Duration leaseDuration;
    private final Duration heartbeatInterval;
    private final Duration staleOperationThreshold;
    private final int staleAuditBatchSize;
    private final String workerId;
    private final ScheduledExecutorService heartbeatExecutor;

    public ProviderOperationWorker(
        ProviderOperationService providerOperationService,
        BookingProviderIntegrationService bookingProviderIntegrationService,
        @Value("${app.billing.provider-operation-worker.batch-size:10}") int batchSize,
        @Value("${app.billing.provider-operation-worker.lease-seconds:120}") long leaseSeconds,
        @Value("${app.billing.provider-operation-worker.stale-minutes:30}") long staleMinutes,
        @Value("${app.billing.provider-operation-worker.stale-batch-size:20}") int staleAuditBatchSize
    ) {
        this.providerOperationService = providerOperationService;
        this.bookingProviderIntegrationService = bookingProviderIntegrationService;
        this.batchSize = Math.max(1, batchSize);
        this.leaseDuration = Duration.ofSeconds(Math.max(30L, leaseSeconds));
        this.heartbeatInterval = Duration.ofSeconds(Math.max(10L, Math.max(leaseSeconds / 3L, 10L)));
        this.staleOperationThreshold = Duration.ofMinutes(Math.max(5L, staleMinutes));
        this.staleAuditBatchSize = Math.max(1, staleAuditBatchSize);
        this.workerId = ManagementFactory.getRuntimeMXBean().getName() + ":" + UUID.randomUUID();
        this.heartbeatExecutor = Executors.newSingleThreadScheduledExecutor(runnable -> {
            Thread thread = new Thread(runnable, "provider-op-heartbeat");
            thread.setDaemon(true);
            return thread;
        });
    }

    @Scheduled(fixedDelayString = "${app.billing.provider-operation-worker.delay-millis:5000}")
    public void drainScheduledBatch() {
        drainBatch(batchSize);
    }

    @Scheduled(fixedDelayString = "${app.billing.provider-operation-worker.audit-delay-millis:60000}")
    public void auditAgedOperations() {
        LocalDateTime updatedBefore = LocalDateTime.now().minus(staleOperationThreshold);
        List<ProviderOperation> agedOperations = providerOperationService.findAgedOperations(
            List.of(
                ProviderOperationStatus.PROCESSING,
                ProviderOperationStatus.RETRYABLE,
                ProviderOperationStatus.UNCERTAIN
            ),
            updatedBefore,
            staleAuditBatchSize
        );
        for (ProviderOperation operation : agedOperations) {
            LOGGER.warn(
                "Provider operation requires attention operationId={} type={} status={} externalReference={} attemptCount={} workerId={} updatedAt={} leaseUntil={}",
                operation.getId(),
                operation.getOperationType(),
                operation.getStatus(),
                operation.getExternalReference(),
                operation.getAttemptCount(),
                operation.getLockedBy(),
                operation.getUpdatedAt(),
                operation.getLeaseUntil()
            );
            if (operation.getOperationType() == com.plura.plurabackend.core.billing.providerops.model.ProviderOperationType.BOOKING_CHECKOUT
                && operation.getStatus() == ProviderOperationStatus.UNCERTAIN) {
                replayOperationAsync(operation.getId(), "stale_uncertain_checkout");
            }
        }
    }

    @Async("billingProviderOperationExecutor")
    public CompletableFuture<Boolean> kickOperationAsync(String operationId) {
        return CompletableFuture.completedFuture(claimAndProcess(operationId));
    }

    public ProviderOperation processOperationNow(String operationId) {
        claimAndProcess(operationId);
        return providerOperationService.getRequired(operationId);
    }

    @Async("billingProviderOperationExecutor")
    public void kickOperationsAsync(List<String> operationIds) {
        if (operationIds == null) {
            return;
        }
        operationIds.forEach(this::claimAndProcess);
    }

    @Async("billingProviderOperationExecutor")
    public CompletableFuture<Boolean> replayOperationAsync(String operationId, String reason) {
        if (!providerOperationService.requeueOperation(operationId, reason)) {
            return CompletableFuture.completedFuture(false);
        }
        return CompletableFuture.completedFuture(claimAndProcess(operationId));
    }

    public ProviderOperation awaitOperationState(String operationId, Duration maxWait) {
        Duration timeout = maxWait == null || maxWait.isNegative() || maxWait.isZero() ? Duration.ofSeconds(1) : maxWait;
        long deadlineNanos = System.nanoTime() + timeout.toNanos();
        ProviderOperation latest = providerOperationService.getRequired(operationId);
        while (System.nanoTime() < deadlineNanos) {
            latest = providerOperationService.getRequired(operationId);
            if (isRequestObservable(latest)) {
                return latest;
            }
            try {
                Thread.sleep(200L);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                return latest;
            }
        }
        return latest;
    }

    private void drainBatch(int limit) {
        List<ProviderOperation> dueOperations = providerOperationService.findDueOperations(limit);
        for (ProviderOperation operation : dueOperations) {
            try {
                claimAndProcess(operation.getId());
            } catch (RuntimeException exception) {
                LOGGER.error(
                    "Scheduled provider operation batch failed operationId={} type={} externalReference={} workerId={}",
                    operation.getId(),
                    operation.getOperationType(),
                    operation.getExternalReference(),
                    workerId,
                    exception
                );
            }
        }
    }

    private boolean claimAndProcess(String operationId) {
        ProviderOperation claimed = providerOperationService.claimOperation(
            operationId,
            workerId,
            LocalDateTime.now().plus(leaseDuration)
        );
        if (claimed == null) {
            return false;
        }
        LOGGER.info(
            "Processing provider operation operationId={} type={} externalReference={} attempt={} workerId={}",
            claimed.getId(),
            claimed.getOperationType(),
            claimed.getExternalReference(),
            claimed.getAttemptCount(),
            workerId
        );
        LeaseHeartbeat heartbeat = startLeaseHeartbeat(claimed.getId());
        try {
            bookingProviderIntegrationService.processClaimedProviderOperation(claimed.getId());
            return true;
        } catch (RuntimeException exception) {
            LOGGER.error(
                "Provider operation processing failed operationId={} type={} externalReference={} attempt={} workerId={}",
                claimed.getId(),
                claimed.getOperationType(),
                claimed.getExternalReference(),
                claimed.getAttemptCount(),
                workerId,
                exception
            );
            throw exception;
        } finally {
            heartbeat.close();
        }
    }

    @PreDestroy
    void shutdownHeartbeatExecutor() {
        heartbeatExecutor.shutdownNow();
    }

    private LeaseHeartbeat startLeaseHeartbeat(String operationId) {
        long heartbeatSeconds = Math.max(5L, heartbeatInterval.toSeconds());
        ScheduledFuture<?> future = heartbeatExecutor.scheduleAtFixedRate(
            () -> renewLease(operationId),
            heartbeatSeconds,
            heartbeatSeconds,
            TimeUnit.SECONDS
        );
        return new LeaseHeartbeat(future);
    }

    private void renewLease(String operationId) {
        boolean renewed = providerOperationService.renewLease(
            operationId,
            workerId,
            LocalDateTime.now().plus(leaseDuration)
        );
        if (!renewed) {
            LOGGER.debug(
                "Provider operation lease renewal skipped operationId={} workerId={}",
                operationId,
                workerId
            );
        }
    }

    private boolean isRequestObservable(ProviderOperation operation) {
        return operation.getStatus() == ProviderOperationStatus.SUCCEEDED
            || operation.getStatus() == ProviderOperationStatus.FAILED
            || operation.getStatus() == ProviderOperationStatus.RETRYABLE
            || operation.getStatus() == ProviderOperationStatus.UNCERTAIN;
    }

    private static final class LeaseHeartbeat implements AutoCloseable {
        private final ScheduledFuture<?> future;

        private LeaseHeartbeat(ScheduledFuture<?> future) {
            this.future = future;
        }

        @Override
        public void close() {
            if (future != null) {
                future.cancel(false);
            }
        }
    }
}
