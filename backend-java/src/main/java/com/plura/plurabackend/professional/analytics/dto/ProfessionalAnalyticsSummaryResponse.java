package com.plura.plurabackend.professional.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * ProfessionalAnalyticsSummaryResponse es un DTO de respuesta del modulo profesionales / analytics / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: profesionales, analytics.
 */
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
