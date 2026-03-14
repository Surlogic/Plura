package com.plura.plurabackend.core.booking.dto;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class BookingPolicyResponse {
    private String id;
    private boolean allowClientCancellation;
    private boolean allowClientReschedule;
    private Integer cancellationWindowHours;
    private Integer rescheduleWindowHours;
    private Integer maxClientReschedules;
    private String lateCancellationRefundMode;
    private BigDecimal lateCancellationRefundValue;
}
