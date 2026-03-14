package com.plura.plurabackend.billing.providerops;

import com.plura.plurabackend.billing.providerops.model.ProviderOperation;
import com.plura.plurabackend.billing.providerops.model.ProviderOperationStatus;
import com.plura.plurabackend.billing.providerops.repository.ProviderOperationRepository;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class ProviderOperationMetrics {

    private static final Logger LOGGER = LoggerFactory.getLogger(ProviderOperationMetrics.class);

    private final ProviderOperationRepository providerOperationRepository;
    private final ProviderOperationAlertThresholds thresholds;
    private final MeterRegistry meterRegistry;
    private final Map<ProviderOperationStatus, AtomicLong> statusCounts = new EnumMap<>(ProviderOperationStatus.class);
    private final Map<ProviderOperationStatus, AtomicLong> oldestAgeSeconds = new EnumMap<>(ProviderOperationStatus.class);
    private final Map<String, AtomicLong> alertCounts = new java.util.LinkedHashMap<>();
    private final Map<String, AtomicLong> alertTriggered = new java.util.LinkedHashMap<>();
    private final Map<String, AtomicLong> alertThresholdValues = new java.util.LinkedHashMap<>();

    public ProviderOperationMetrics(
        ProviderOperationRepository providerOperationRepository,
        ProviderOperationAlertThresholds thresholds,
        MeterRegistry meterRegistry
    ) {
        this.providerOperationRepository = providerOperationRepository;
        this.thresholds = thresholds;
        this.meterRegistry = meterRegistry;

        for (ProviderOperationStatus status : ProviderOperationStatus.values()) {
            AtomicLong countGauge = new AtomicLong(0L);
            AtomicLong ageGauge = new AtomicLong(0L);
            statusCounts.put(status, countGauge);
            oldestAgeSeconds.put(status, ageGauge);

            Gauge.builder("plura.provider_operation.status.count", countGauge, AtomicLong::get)
                .description("Provider operations grouped by current status")
                .tag("status", status.name())
                .register(meterRegistry);
            Gauge.builder("plura.provider_operation.status.oldest_age.seconds", ageGauge, AtomicLong::get)
                .description("Age in seconds of the oldest provider operation for a given status")
                .tag("status", status.name())
                .register(meterRegistry);
        }

        registerAlertGauge("stale_uncertain", thresholds.uncertainOlderThanMinutes());
        registerAlertGauge("excessive_retryable", thresholds.retryableThreshold());
        registerAlertGauge("expired_leases", thresholds.leaseExpiredGraceMinutes());
        refreshGauges();
    }

    @Scheduled(fixedDelayString = "${app.billing.provider-operation-alerts.metrics-refresh-millis:30000}")
    @Transactional(readOnly = true)
    public void refreshGauges() {
        try {
            LocalDateTime now = LocalDateTime.now();

            for (ProviderOperationStatus status : ProviderOperationStatus.values()) {
                statusCounts.get(status).set(providerOperationRepository.countByStatus(status));
                oldestAgeSeconds.get(status).set(resolveOldestAgeSeconds(status, now));
            }

            long staleUncertainCount = providerOperationRepository.countByStatusAndUpdatedAtBefore(
                ProviderOperationStatus.UNCERTAIN,
                now.minusMinutes(thresholds.uncertainOlderThanMinutes())
            );
            setAlert("stale_uncertain", staleUncertainCount, staleUncertainCount > 0, thresholds.uncertainOlderThanMinutes());

            long retryableCount = providerOperationRepository.countByStatus(ProviderOperationStatus.RETRYABLE);
            setAlert(
                "excessive_retryable",
                retryableCount,
                retryableCount > thresholds.retryableThreshold(),
                thresholds.retryableThreshold()
            );

            long expiredLeaseCount = providerOperationRepository.countExpiredLeases(
                ProviderOperationStatus.PROCESSING,
                now.minusMinutes(thresholds.leaseExpiredGraceMinutes())
            );
            setAlert(
                "expired_leases",
                expiredLeaseCount,
                expiredLeaseCount > 0,
                thresholds.leaseExpiredGraceMinutes()
            );
        } catch (RuntimeException exception) {
            Counter.builder("plura.provider_operation.metrics.refresh.errors")
                .description("Provider operation metrics refresh errors")
                .register(meterRegistry)
                .increment();
            LOGGER.warn("Failed to refresh provider operation gauges", exception);
        }
    }

    private void registerAlertGauge(String alertName, long thresholdValue) {
        AtomicLong countGauge = new AtomicLong(0L);
        AtomicLong triggeredGauge = new AtomicLong(0L);
        AtomicLong thresholdGauge = new AtomicLong(thresholdValue);
        alertCounts.put(alertName, countGauge);
        alertTriggered.put(alertName, triggeredGauge);
        alertThresholdValues.put(alertName, thresholdGauge);

        Gauge.builder("plura.provider_operation.alert.count", countGauge, AtomicLong::get)
            .description("Count associated with provider operation operational alerts")
            .tag("alert", alertName)
            .register(meterRegistry);
        Gauge.builder("plura.provider_operation.alert.triggered", triggeredGauge, AtomicLong::get)
            .description("Whether a provider operation operational alert is currently triggered")
            .tag("alert", alertName)
            .register(meterRegistry);
        Gauge.builder("plura.provider_operation.alert.threshold", thresholdGauge, AtomicLong::get)
            .description("Threshold used by provider operation operational alerts")
            .tag("alert", alertName)
            .register(meterRegistry);
    }

    private void setAlert(String alertName, long count, boolean triggered, long thresholdValue) {
        alertCounts.get(alertName).set(count);
        alertTriggered.get(alertName).set(triggered ? 1L : 0L);
        alertThresholdValues.get(alertName).set(thresholdValue);
    }

    private long resolveOldestAgeSeconds(ProviderOperationStatus status, LocalDateTime now) {
        List<ProviderOperation> operations = providerOperationRepository.findByStatusOrderByUpdatedAtAsc(
            status,
            PageRequest.of(0, 1)
        );
        if (operations.isEmpty() || operations.get(0).getUpdatedAt() == null) {
            return 0L;
        }
        long ageSeconds = Duration.between(operations.get(0).getUpdatedAt(), now).getSeconds();
        return Math.max(0L, ageSeconds);
    }
}
