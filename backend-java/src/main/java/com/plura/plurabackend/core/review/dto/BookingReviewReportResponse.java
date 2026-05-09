package com.plura.plurabackend.core.review.dto;

import com.plura.plurabackend.core.review.model.BookingReviewReportReason;
import com.plura.plurabackend.core.review.model.BookingReviewReportStatus;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * BookingReviewReportResponse es un DTO de respuesta del modulo resenas / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: reservas, resenas.
 */
@Data
@AllArgsConstructor
public class BookingReviewReportResponse {
    private Long id;
    private Long reviewId;
    private Long professionalId;
    private BookingReviewReportReason reason;
    private String note;
    private BookingReviewReportStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;
}
