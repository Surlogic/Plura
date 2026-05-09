package com.plura.plurabackend.core.review.ops.dto;

import com.plura.plurabackend.core.review.dto.ReviewReportSummaryResponse;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * InternalReviewListItemResponse es un DTO de respuesta del modulo resenas / operaciones internas / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: paneles internos, resenas.
 */
@Data
@AllArgsConstructor
public class InternalReviewListItemResponse {
    private Long id;
    private Long bookingId;
    private Long professionalId;
    private String professionalName;
    private String professionalSlug;
    private Long clientUserId;
    private String clientName;
    private Integer rating;
    private String text;
    private boolean textHiddenByProfessional;
    private boolean textHiddenByInternalOps;
    private boolean reported;
    private long reportCount;
    private ReviewReportSummaryResponse latestReport;
    private String internalModerationNote;
    private String createdAt;
}
