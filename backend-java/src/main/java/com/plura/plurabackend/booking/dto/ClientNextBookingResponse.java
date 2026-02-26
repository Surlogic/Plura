package com.plura.plurabackend.booking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ClientNextBookingResponse {
    private Long id;
    private String status;
    private String startDateTime;
    private String serviceName;
    private String professionalName;
    private String professionalSlug;
    private String professionalLocation;
}
