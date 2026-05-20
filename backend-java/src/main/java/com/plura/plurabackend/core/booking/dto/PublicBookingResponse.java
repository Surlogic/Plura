package com.plura.plurabackend.core.booking.dto;

import lombok.Data;

/**
 * PublicBookingResponse es un DTO de respuesta del modulo reservas / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: reservas, superficie publica.
 */
@Data
public class PublicBookingResponse {
    private Long id;
    private String status;
    private String startDateTime;
    private String timezone;
    private String serviceId;
    private String professionalId;
    private String userId;
    private Boolean emailVerificationRequired;

    public PublicBookingResponse(
        Long id,
        String status,
        String startDateTime,
        String timezone,
        String serviceId,
        String professionalId,
        String userId
    ) {
        this(id, status, startDateTime, timezone, serviceId, professionalId, userId, null);
    }

    public PublicBookingResponse(
        Long id,
        String status,
        String startDateTime,
        String timezone,
        String serviceId,
        String professionalId,
        String userId,
        Boolean emailVerificationRequired
    ) {
        this.id = id;
        this.status = status;
        this.startDateTime = startDateTime;
        this.timezone = timezone;
        this.serviceId = serviceId;
        this.professionalId = professionalId;
        this.userId = userId;
        this.emailVerificationRequired = emailVerificationRequired;
    }
}
