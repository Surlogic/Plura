package com.plura.plurabackend.professional.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProfessionalAnalyticsSummaryResponse {
    private int todayBookings;
    private int yesterdayBookings;
    private int todayDelta;
    private int weeklyUniqueClients;
    private int weeklyScheduledDays;
    private int weeklyDaysWithReservations;
    private int weeklyOccupancyRate;
    private Integer completedBookings;
    private Integer cancelledBookings;
    private Integer noShowBookings;
}
