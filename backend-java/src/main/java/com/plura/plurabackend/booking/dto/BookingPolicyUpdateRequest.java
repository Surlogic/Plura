package com.plura.plurabackend.booking.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;

@Data
public class BookingPolicyUpdateRequest {

    private Boolean allowClientCancellation;
    private Boolean allowClientReschedule;

    @Min(0)
    @Max(720)
    private Integer cancellationWindowHours;

    @Min(0)
    @Max(720)
    private Integer rescheduleWindowHours;

    @Min(0)
    @Max(20)
    private Integer maxClientReschedules;

    private Boolean retainDepositOnLateCancellation;
}
