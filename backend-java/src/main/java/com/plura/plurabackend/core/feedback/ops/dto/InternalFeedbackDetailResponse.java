package com.plura.plurabackend.core.feedback.ops.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * InternalFeedbackDetailResponse es un DTO de respuesta del modulo feedback / operaciones internas / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: feedback, paneles internos.
 */
@Data
@AllArgsConstructor
public class InternalFeedbackDetailResponse {
    private Long id;
    private Long authorUserId;
    private String authorName;
    private String authorRole;
    private Integer rating;
    private String text;
    private String category;
    private String contextSource;
    private String status;
    private String createdAt;
    private String updatedAt;
}
