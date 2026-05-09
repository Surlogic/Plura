package com.plura.plurabackend.core.booking.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * BookingRefundRecordResponse es un DTO de respuesta del modulo reservas / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: reservas.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class BookingRefundRecordResponse {
    private String id;
    private String actorType;
    private Long actorUserId;
    private BigDecimal requestedAmount;
    private BigDecimal targetAmount;
    private String status;
    private String reasonCode;
    private String currency;
    private String providerReference;
    private String relatedDecisionId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
