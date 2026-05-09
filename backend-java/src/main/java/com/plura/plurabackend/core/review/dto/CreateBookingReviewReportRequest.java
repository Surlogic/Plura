package com.plura.plurabackend.core.review.dto;

import com.plura.plurabackend.core.review.model.BookingReviewReportReason;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * CreateBookingReviewReportRequest es un DTO de entrada del modulo resenas / contratos DTO.
 * Responsabilidad: definir y validar los datos que llegan desde la API.
 * Validacion: sus anotaciones Bean Validation son parte del contrato publico del endpoint que lo recibe.
 * Foco funcional: reservas, resenas.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateBookingReviewReportRequest {

    @NotNull
    private BookingReviewReportReason reason;

    @Size(max = 1000)
    private String note;
}
