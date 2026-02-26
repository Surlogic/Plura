package com.plura.plurabackend.booking.dto;

import com.plura.plurabackend.booking.model.BookingStatus;
import java.time.LocalDateTime;
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

    public ProfessionalBookingResponse(
        Long id,
        Long userId,
        String clientName,
        String serviceId,
        String serviceName,
        LocalDateTime startDateTime,
        BookingStatus status
    ) {
        this.id = id;
        this.userId = String.valueOf(userId);
        this.clientName = clientName;
        this.serviceId = serviceId;
        this.serviceName = serviceName;
        this.startDateTime = startDateTime == null ? "" : startDateTime.toString();
        this.status = status == null ? "" : status.name();
    }
}
