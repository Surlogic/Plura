package com.plura.plurabackend.booking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ProfessionalBookingResponse {
    private Long id;
    private String userId;
    private String clientName;
    private String serviceId;
    private String serviceName;
    private String startDateTime;
    private String status;
}
