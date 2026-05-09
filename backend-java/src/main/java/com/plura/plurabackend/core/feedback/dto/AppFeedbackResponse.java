package com.plura.plurabackend.core.feedback.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * AppFeedbackResponse es un DTO de respuesta del modulo feedback / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: feedback.
 */
@Data
@AllArgsConstructor
public class AppFeedbackResponse {
    private Long id;
    private Integer rating;
    private String text;
    private String category;
    private String contextSource;
    private String createdAt;
    private String authorRole;
    private String authorDisplayName;
    private Boolean publicVisible;
}
