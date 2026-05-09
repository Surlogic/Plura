package com.plura.plurabackend.core.booking.dto;

import java.math.BigDecimal;
import com.plura.plurabackend.core.booking.model.BookingProcessingFeeMode;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * BookingPaymentBreakdownResponse es un DTO de respuesta del modulo reservas / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: reservas, pagos.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BookingPaymentBreakdownResponse {
    private BigDecimal prepaidBaseAmount;
    private BigDecimal processingFeeAmount;
    private BigDecimal totalAmount;
    private String currency;
    private String processingFeeLabel;
    private BookingProcessingFeeMode processingFeeMode;
    private BigDecimal providerFeePercent;
    private BigDecimal taxPercent;
    private BigDecimal platformFeePercent;
}
