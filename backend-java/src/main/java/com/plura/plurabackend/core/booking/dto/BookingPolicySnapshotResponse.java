package com.plura.plurabackend.core.booking.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BookingPolicySnapshotResponse {
    private String sourcePolicyId;
    private Long sourcePolicyVersion;
    private Long professionalId;
    private LocalDateTime resolvedAt;
    private String policySource;
    private boolean allowClientCancellation;
    private boolean allowClientReschedule;
    private Integer cancellationWindowHours;
    private Integer rescheduleWindowHours;
    private Integer maxClientReschedules;
    private String lateCancellationRefundMode;
    private BigDecimal lateCancellationRefundValue;
}
