package com.plura.plurabackend.core.billing.providerops;

import com.plura.plurabackend.core.billing.providerops.model.ProviderOperation;
import com.plura.plurabackend.core.billing.providerops.model.ProviderOperationStatus;
import com.plura.plurabackend.core.booking.finance.BookingProviderIntegrationService;
import com.plura.plurabackend.core.observability.AppErrorRecorder;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * ProviderOperationWorker es un worker asincronico del modulo billing / operaciones de proveedor.
 * Responsabilidad: procesar tareas pendientes con control de estado, reintentos o leases.
 * Colabora con: providerOperationService, bookingProviderIntegrationService, batchSize, leaseDuration, entre otros.
 * Foco funcional: operaciones asincronicas, proveedores externos, trabajadores.
 */
@Component
public class ProviderOperationWorker {

    private static final Logger LOGGER = LoggerFactory.getLogger(ProviderOperationWorker.class);

    private final ProviderOperationService providerOperationService;
    private final BookingProviderIntegrationService bookingProviderIntegrationService;
    private final AppErrorRecorder appErrorRecorder;
    private final int batchSize;
    private final Duration leaseDuration;
    private final Duration heartbeatInterval;
    private final Duration staleOperationThreshold;
    private final int staleAuditBatchSize;
    private final String workerId;
    private final ScheduledExecutorService heartbeatExecutor;

    @Autowired
    public ProviderOperationWorker(
        ProviderOperationService providerOperationService,
        BookingProviderIntegrationService bookingProviderIntegrationService,
        AppErrorRecorder appErrorRecorder,
        @Value("${app.billing.provider-operation-worker.batch-size:10}") int batchSize,
        @Value("${app.billing.provider-operation-worker.lease-seconds:120}") long leaseSeconds,
        @Value("${app.billing.provider-operation-worker.stale-minutes:30}") long staleMinutes,
        @Value("${app.billing.provider-operation-worker.stale-batch-size:20}") int staleAuditBatchSize
    ) {
        this.providerOperationService = providerOperationService;
        this.bookingProviderIntegrationService = bookingProviderIntegrationService;
        this.appErrorRecorder = appErrorRecorder;
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

    public ProviderOperationWorker(
        ProviderOperationService providerOperationService,
        BookingProviderIntegrationService bookingProviderIntegrationService,
        int batchSize,
        long leaseSeconds,
        long staleMinutes,
        int staleAuditBatchSize
    ) {
        this(
            providerOperationService,
            bookingProviderIntegrationService,
            null,
            batchSize,
            leaseSeconds,
            staleMinutes,
            staleAuditBatchSize
        );
    }

    /**
     * Ejecuta la logica de drain scheduled lote manteniendola encapsulada en este componente.
     */
    @Scheduled(fixedDelayString = "${app.billing.provider-operation-worker.delay-millis:5000}")
    public void drainScheduledBatch() {
        drainBatch(batchSize);
    }

    /**
     * Ejecuta la logica de audit aged operaciones manteniendola encapsulada en este componente.
     */
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

    /**
     * Ejecuta la logica de kick operacion asincronico manteniendola encapsulada en este componente.
     */
    @Async("billingProviderOperationExecutor")
    public CompletableFuture<Boolean> kickOperationAsync(String operationId) {
        return CompletableFuture.completedFuture(claimAndProcess(operationId));
    }

    /**
     * Ejecuta la logica de process operacion now manteniendola encapsulada en este componente.
     */
    public ProviderOperation processOperationNow(String operationId) {
        claimAndProcess(operationId);
        return providerOperationService.getRequired(operationId);
    }

    /**
     * Ejecuta la logica de kick operaciones asincronico manteniendola encapsulada en este componente.
     */
    @Async("billingProviderOperationExecutor")
    public void kickOperationsAsync(List<String> operationIds) {
        if (operationIds == null) {
            return;
        }
        operationIds.forEach(this::claimAndProcess);
    }

    /**
     * Ejecuta la logica de replay operacion asincronico manteniendola encapsulada en este componente.
     */
    @Async("billingProviderOperationExecutor")
    public CompletableFuture<Boolean> replayOperationAsync(String operationId, String reason) {
        if (!providerOperationService.requeueOperation(operationId, reason)) {
            return CompletableFuture.completedFuture(false);
        }
        return CompletableFuture.completedFuture(claimAndProcess(operationId));
    }

    /**
     * Ejecuta la logica de await operacion estado manteniendola encapsulada en este componente.
     */
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

    /**
     * Ejecuta la logica de drain lote manteniendola encapsulada en este componente.
     */
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
                if (appErrorRecorder != null) {
                    appErrorRecorder.recordBackgroundException(
                        exception,
                        "provider-operation.scheduled-batch",
                        java.util.Map.of(
                            "operationId", operation.getId(),
                            "operationType", String.valueOf(operation.getOperationType()),
                            "externalReference", String.valueOf(operation.getExternalReference())
                        )
                    );
                }
            }
        }
    }

    /**
     * Ejecuta la logica de claim and process manteniendola encapsulada en este componente.
     */
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

    /**
     * Ejecuta la logica de shutdown heartbeat executor manteniendola encapsulada en este componente.
     */
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

    /**
     * Ejecuta la logica de renew lease manteniendola encapsulada en este componente.
     */
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

    /**
     * Evalua is solicitud observable y devuelve una decision booleana para el llamador.
     */
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

    /**
     * Ejecuta la logica de close manteniendola encapsulada en este componente.
     */
        @Override
        public void close() {
            if (future != null) {
                future.cancel(false);
            }
        }
    }
}
