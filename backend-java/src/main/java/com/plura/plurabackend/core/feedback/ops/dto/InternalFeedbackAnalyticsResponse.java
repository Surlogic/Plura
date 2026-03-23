package com.plura.plurabackend.core.feedback.ops.dto;

import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;

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
