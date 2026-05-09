package com.plura.plurabackend.core.booking.policy;

import com.plura.plurabackend.core.booking.policy.model.LateCancellationRefundMode;
import java.math.BigDecimal;

/**
 * BookingPolicyDefaults es un componente de dominio del modulo reservas / politicas.
 * Responsabilidad: encapsular comportamiento propio del modulo y mantenerlo fuera de controllers u otras capas.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: reservas.
 */
public final class BookingPolicyDefaults {

    public static final boolean DEFAULT_ALLOW_CLIENT_CANCELLATION = true;
    public static final boolean DEFAULT_ALLOW_CLIENT_RESCHEDULE = true;
    public static final int DEFAULT_MAX_CLIENT_RESCHEDULES = 1;
    public static final LateCancellationRefundMode DEFAULT_LATE_CANCELLATION_REFUND_MODE = LateCancellationRefundMode.FULL;
    public static final BigDecimal DEFAULT_LATE_CANCELLATION_REFUND_VALUE = BigDecimal.valueOf(100);

    private BookingPolicyDefaults() {}

    /**
     * Resuelve max cliente reschedules normalizando entradas, defaults y casos borde.
     */
    public static int resolveMaxClientReschedules(Integer value) {
        return value == null ? DEFAULT_MAX_CLIENT_RESCHEDULES : value;
    }
}
