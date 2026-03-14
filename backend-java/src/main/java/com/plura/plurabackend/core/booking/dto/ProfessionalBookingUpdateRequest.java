package com.plura.plurabackend.core.booking.dto;

import com.plura.plurabackend.core.booking.model.BookingOperationalStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ProfessionalBookingUpdateRequest {

    @NotNull
    private BookingOperationalStatus status;
}
