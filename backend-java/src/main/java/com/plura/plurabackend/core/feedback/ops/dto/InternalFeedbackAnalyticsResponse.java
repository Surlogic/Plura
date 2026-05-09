package com.plura.plurabackend.core.feedback.ops.dto;

import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * InternalFeedbackAnalyticsResponse es un DTO de respuesta del modulo feedback / operaciones internas / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: analytics, feedback, paneles internos.
 */
@Data
@AllArgsConstructor
public class InternalFeedbackAnalyticsResponse {
    private long totalFeedbacks;
    private Double averageRating;
    private Map<String, Long> countByAuthorRole;
    private Map<String, Long> countByCategory;
    private Map<Integer, Long> countByRating;
    private List<DailyCount> dailyCounts;

    @Data
    @AllArgsConstructor
    public static class DailyCount {
        private String date;
        private long count;
        private double averageRating;
    }
}
