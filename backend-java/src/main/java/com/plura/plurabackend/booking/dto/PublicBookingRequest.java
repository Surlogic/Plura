package com.plura.plurabackend.booking.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PublicBookingRequest {

    @NotBlank
    private String serviceId;

    @NotBlank
    private String startDateTime;
}
