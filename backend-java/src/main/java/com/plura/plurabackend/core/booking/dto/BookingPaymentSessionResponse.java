package com.plura.plurabackend.core.booking.dto;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * BookingPaymentSessionResponse es un DTO de respuesta del modulo reservas / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: sesiones, reservas, pagos.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BookingPaymentSessionResponse {
    private Long bookingId;
    private String transactionId;
    private String provider;
    private String checkoutUrl;
    private BigDecimal amount;
    private BookingPaymentBreakdownResponse paymentBreakdown;
    private String currency;
    private String financialStatus;
}
