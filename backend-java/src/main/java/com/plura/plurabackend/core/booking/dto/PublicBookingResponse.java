package com.plura.plurabackend.core.booking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * PublicBookingResponse es un DTO de respuesta del modulo reservas / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: reservas, superficie publica.
 */
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
