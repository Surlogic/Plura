package com.plura.plurabackend.core.booking.policy;

import com.plura.plurabackend.core.booking.policy.model.LateCancellationRefundMode;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * BookingPolicySnapshot es un modelo inmutable del modulo reservas / politicas.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: reservas.
 */
public record BookingPolicySnapshot(
    String sourcePolicyId,
    Long sourcePolicyVersion,
    Long professionalId,
    LocalDateTime resolvedAt,
    boolean allowClientCancellation,
    boolean allowClientReschedule,
    Integer cancellationWindowHours,
    Integer rescheduleWindowHours,
    Integer maxClientReschedules,
    LateCancellationRefundMode lateCancellationRefundMode,
    BigDecimal lateCancellationRefundValue
) {}
