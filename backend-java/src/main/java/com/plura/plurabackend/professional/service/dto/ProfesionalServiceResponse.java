package com.plura.plurabackend.professional.service.dto;

import com.plura.plurabackend.core.booking.dto.BookingPaymentBreakdownResponse;
import com.plura.plurabackend.core.booking.model.BookingProcessingFeeMode;
import com.plura.plurabackend.core.booking.model.ServicePaymentType;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * ProfesionalServiceResponse es un DTO de respuesta del modulo profesionales / servicios / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: servicios.
 */
@Data
@AllArgsConstructor
public class ProfesionalServiceResponse {
    private String id;
    private String name;
    private String description;
    private String categorySlug;
    private String categoryName;
    private String price;
    private BigDecimal depositAmount;
    private String currency;
    private String duration;
    private String imageUrl;
    private Integer postBufferMinutes;
    private ServicePaymentType paymentType;
    private BookingProcessingFeeMode processingFeeMode;
    private Boolean active;
    private BookingPaymentBreakdownResponse paymentBreakdown;
}
