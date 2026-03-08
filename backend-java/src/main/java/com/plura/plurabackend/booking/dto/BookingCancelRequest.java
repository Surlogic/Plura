package com.plura.plurabackend.booking.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class BookingCancelRequest {

    @Size(max = 500)
    private String reason;
}
