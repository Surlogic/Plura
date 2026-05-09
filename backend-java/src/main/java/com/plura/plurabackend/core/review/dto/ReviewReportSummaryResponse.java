package com.plura.plurabackend.core.review.dto;

import com.plura.plurabackend.core.review.model.BookingReviewReportReason;
import com.plura.plurabackend.core.review.model.BookingReviewReportStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * ReviewReportSummaryResponse es un DTO de respuesta del modulo resenas / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: resenas.
 */
@Data
@AllArgsConstructor
public class ReviewReportSummaryResponse {
    private Long id;
    private BookingReviewReportReason reason;
    private String note;
    private BookingReviewReportStatus status;
    private String createdAt;
    private String resolvedAt;
}
