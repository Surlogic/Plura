package com.plura.plurabackend.booking.policy;

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
    boolean retainDepositOnLateCancellation
) {}
