package com.plura.plurabackend.core.booking.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class BookingPaymentSessionRequest {

    @Size(max = 30)
    @Pattern(regexp = "^(|[A-Z_]+)$")
    private String provider;
}
