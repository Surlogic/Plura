package com.plura.plurabackend.core.booking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PublicBookingResponse {
    private Long id;
    private String status;
    private String startDateTime;
    private String timezone;
    private String serviceId;
    private String professionalId;
    private String userId;
}
