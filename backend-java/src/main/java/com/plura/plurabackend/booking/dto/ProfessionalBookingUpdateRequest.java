package com.plura.plurabackend.booking.dto;

import com.plura.plurabackend.booking.model.BookingStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ProfessionalBookingUpdateRequest {

    @NotNull
    private BookingStatus status;
}
