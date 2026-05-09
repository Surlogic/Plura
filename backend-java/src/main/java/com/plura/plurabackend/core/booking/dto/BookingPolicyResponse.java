package com.plura.plurabackend.core.booking.dto;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * BookingPolicyResponse es un DTO de respuesta del modulo reservas / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: reservas.
 */
@Data
@AllArgsConstructor
public class BookingPolicyResponse {
    private String id;
    private boolean allowClientCancellation;
    private boolean allowClientReschedule;
    private Integer cancellationWindowHours;
    private Integer rescheduleWindowHours;
    private Integer maxClientReschedules;
    private String lateCancellationRefundMode;
    private BigDecimal lateCancellationRefundValue;
}
