package com.plura.plurabackend.core.billing.providerops;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class ProviderOperationAlertThresholds {

    private final long uncertainOlderThanMinutes;
    private final long retryableThreshold;
    private final long leaseExpiredGraceMinutes;
    private final int sampleLimit;
    private final long metricsRefreshMillis;

    public ProviderOperationAlertThresholds(
        @Value("${app.billing.provider-operation-alerts.uncertain-older-than-minutes:30}") long uncertainOlderThanMinutes,
        @Value("${app.billing.provider-operation-alerts.retryable-threshold:10}") long retryableThreshold,
        @Value("${app.billing.provider-operation-alerts.lease-expired-grace-minutes:5}") long leaseExpiredGraceMinutes,
        @Value("${app.billing.provider-operation-alerts.sample-limit:10}") int sampleLimit,
        @Value("${app.billing.provider-operation-alerts.metrics-refresh-millis:30000}") long metricsRefreshMillis
    ) {
        this.uncertainOlderThanMinutes = Math.max(1L, uncertainOlderThanMinutes);
        this.retryableThreshold = Math.max(0L, retryableThreshold);
        this.leaseExpiredGraceMinutes = Math.max(0L, leaseExpiredGraceMinutes);
        this.sampleLimit = Math.max(1, sampleLimit);
        this.metricsRefreshMillis = Math.max(5_000L, metricsRefreshMillis);
    }

    public long uncertainOlderThanMinutes() {
        return uncertainOlderThanMinutes;
    }

    public long retryableThreshold() {
        return retryableThreshold;
    }

    public long leaseExpiredGraceMinutes() {
        return leaseExpiredGraceMinutes;
    }

    public int sampleLimit() {
        return sampleLimit;
    }

    public long metricsRefreshMillis() {
        return metricsRefreshMillis;
    }
}
