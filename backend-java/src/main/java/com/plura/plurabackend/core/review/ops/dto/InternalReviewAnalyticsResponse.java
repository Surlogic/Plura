package com.plura.plurabackend.core.review.ops.dto;

import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * InternalReviewAnalyticsResponse es un DTO de respuesta del modulo resenas / operaciones internas / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: analytics, paneles internos, resenas.
 */
@Data
@AllArgsConstructor
public class InternalReviewAnalyticsResponse {
    private long totalReviews;
    private Double averageRating;
    private Map<Integer, Long> countByRating;
    private long withText;
    private long withoutText;
    private long textHidden;
    private List<TopProfessional> topByVolume;
    private List<TopProfessional> topByRating;
    private List<DailyCount> dailyCounts;

    @Data
    @AllArgsConstructor
    public static class TopProfessional {
        private Long professionalId;
        private String name;
        private String slug;
        private long reviewCount;
        private double averageRating;
    }

    @Data
    @AllArgsConstructor
    public static class DailyCount {
        private String date;
        private long count;
        private double averageRating;
    }
}
