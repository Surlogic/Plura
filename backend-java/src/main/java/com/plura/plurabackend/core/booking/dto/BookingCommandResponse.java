package com.plura.plurabackend.core.booking.dto;

import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * BookingCommandResponse es un DTO de respuesta del modulo reservas / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: reservas.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class BookingCommandResponse {
    private ProfessionalBookingResponse booking;
    private BookingActionDecisionResponse decision;
    private String operationalStatus;
    private BookingFinancialSummaryResponse financialSummary;
    private BookingRefundRecordResponse refundRecord;
    private BookingPayoutRecordResponse payoutRecord;
    private String messageCode;
    private Map<String, String> messageParams;
    private String plainTextFallback;
}
