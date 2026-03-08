package com.plura.plurabackend.booking.dto;

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
    private boolean retainDepositOnLateCancellation;
}
