package com.plura.plurabackend.core.booking.policy;

import com.plura.plurabackend.core.booking.policy.model.LateCancellationRefundMode;
import java.math.BigDecimal;
import java.time.LocalDateTime;

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
