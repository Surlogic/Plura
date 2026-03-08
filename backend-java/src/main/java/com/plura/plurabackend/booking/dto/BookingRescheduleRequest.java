package com.plura.plurabackend.booking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class BookingRescheduleRequest {

    @NotBlank
    @Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}T.*$")
    private String startDateTime;

    @Size(max = 64)
    private String timezone;
}
