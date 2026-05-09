package com.plura.plurabackend.core.billing.providerops;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * ProviderOperationAlertThresholds es un componente de dominio del modulo billing / operaciones de proveedor.
 * Responsabilidad: encapsular comportamiento propio del modulo y mantenerlo fuera de controllers u otras capas.
 * Colabora con: uncertainOlderThanMinutes, retryableThreshold, leaseExpiredGraceMinutes, sampleLimit, entre otros.
 * Foco funcional: operaciones asincronicas, proveedores externos.
 */
@Component
public class ProviderOperationAlertThresholds {

    private final long uncertainOlderThanMinutes;
    private final long retryableThreshold;
    private final long leaseExpiredGraceMinutes;
    private final int sampleLimit;

    public ProviderOperationAlertThresholds(
    /**
     * Define cuantos minutos puede permanecer incierta una operacion antes de generar alerta.
     */
        @Value("${app.billing.provider-operation-alerts.uncertain-older-than-minutes:30}") long uncertainOlderThanMinutes,
        @Value("${app.billing.provider-operation-alerts.retryable-threshold:10}") long retryableThreshold,
        @Value("${app.billing.provider-operation-alerts.lease-expired-grace-minutes:5}") long leaseExpiredGraceMinutes,
        @Value("${app.billing.provider-operation-alerts.sample-limit:10}") int sampleLimit
    ) {
        this.uncertainOlderThanMinutes = Math.max(1L, uncertainOlderThanMinutes);
        this.retryableThreshold = Math.max(0L, retryableThreshold);
        this.leaseExpiredGraceMinutes = Math.max(0L, leaseExpiredGraceMinutes);
        this.sampleLimit = Math.max(1, sampleLimit);
    }

    public long uncertainOlderThanMinutes() {
        return uncertainOlderThanMinutes;
    }

    /**
     * Ejecuta la logica de retryable threshold manteniendola encapsulada en este componente.
     */
    public long retryableThreshold() {
        return retryableThreshold;
    }

    /**
     * Ejecuta la logica de lease expired grace minutes manteniendola encapsulada en este componente.
     */
    public long leaseExpiredGraceMinutes() {
        return leaseExpiredGraceMinutes;
    }

    /**
     * Ejecuta la logica de sample limit manteniendola encapsulada en este componente.
     */
    public int sampleLimit() {
        return sampleLimit;
    }

}
