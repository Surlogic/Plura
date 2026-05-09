package com.plura.plurabackend.core.analytics.ops.dto;

import java.util.List;

/**
 * InternalOpsAnalyticsResponse es un modelo inmutable del modulo analytics / operaciones internas / contratos DTO.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: analytics, paneles internos.
 */
public record InternalOpsAnalyticsResponse(
    Overview overview,
    ReservationFunnel reservationFunnel,
    List<CategoryPerformance> categoryPerformance,
    List<ServicePerformance> servicePerformance,
    List<FunnelByCategory> funnelByCategory,
    RetentionMetrics retention,
    List<DemandPoint> demandByWeekday,
    List<DemandPoint> demandByHour,
    List<CityPerformance> cityPerformance,
    List<ProfessionalPerformance> professionalPerformance,
    List<PlatformPerformance> platformPerformance,
    List<PaymentTypePerformance> paymentTypePerformance
) {
    /**
     * Bloque de datos overview dentro de la respuesta principal.
     * Agrupa metricas relacionadas para que el frontend no tenga que reconstruirlas.
     */
    public record Overview(
        String from,
        String to,
        long totalReservations,
        long confirmedReservations,
        long completedReservations,
        long cancelledReservations,
        long noShowReservations,
        double estimatedRevenue,
        double averageTicket,
        long totalSearches,
        long totalProfileViews
    ) {
    }

    /**
     * Bloque de datos reservation funnel dentro de la respuesta principal.
     * Agrupa metricas relacionadas para que el frontend no tenga que reconstruirlas.
     */
    public record ReservationFunnel(
        long searches,
        long profileViews,
        long reservationFlowSessions,
        long serviceConfirmedSessions,
        long dateConfirmedSessions,
        long timeSelectedSessions,
        long reviewSessions,
        long confirmSessions,
        long authOpenedSessions,
        long authCompletedSessions,
        long submitAttemptedSessions,
        long bookingsCreated,
        long paymentSessions,
        long bookingsConfirmed,
        long bookingsCompleted,
        double profileToFlowRate,
        double flowToSubmitRate,
        double submitToBookingRate,
        double bookingToConfirmationRate,
        double bookingToCompletionRate
    ) {
    }

    /**
     * Bloque de datos category performance dentro de la respuesta principal.
     * Agrupa metricas relacionadas para que el frontend no tenga que reconstruirlas.
     */
    public record CategoryPerformance(
        String categoryKey,
        String categoryLabel,
        long totalBookings,
        long pendingBookings,
        long confirmedBookings,
        long completedBookings,
        long cancelledBookings,
        long noShowBookings,
        double cancellationRate,
        double noShowRate,
        double estimatedRevenue,
        double averageTicket
    ) {
    }

    /**
     * Bloque de datos service performance dentro de la respuesta principal.
     * Agrupa metricas relacionadas para que el frontend no tenga que reconstruirlas.
     */
    public record ServicePerformance(
        String serviceId,
        String serviceName,
        String categoryLabel,
        long totalBookings,
        double estimatedRevenue,
        double averageTicket
    ) {
    }

    /**
     * Bloque de datos funnel by category dentro de la respuesta principal.
     * Agrupa metricas relacionadas para que el frontend no tenga que reconstruirlas.
     */
    public record FunnelByCategory(
        String categoryKey,
        String categoryLabel,
        long searches,
        long profileViews,
        long reservations,
        double searchToProfileRate,
        double profileToReservationRate,
        double searchToReservationRate
    ) {
    }

    /**
     * Bloque de datos retention metrics dentro de la respuesta principal.
     * Agrupa metricas relacionadas para que el frontend no tenga que reconstruirlas.
     */
    public record RetentionMetrics(
        long activeClients,
        long returningClients,
        double returningRate,
        long repeatClientsInPeriod,
        double repeatRate,
        long previousWindowClients,
        long retainedFromPreviousWindow,
        double windowRetentionRate
    ) {
    }

    /**
     * Bloque de datos demand point dentro de la respuesta principal.
     * Agrupa metricas relacionadas para que el frontend no tenga que reconstruirlas.
     */
    public record DemandPoint(
        String label,
        long count
    ) {
    }

    /**
     * Bloque de datos city performance dentro de la respuesta principal.
     * Agrupa metricas relacionadas para que el frontend no tenga que reconstruirlas.
     */
    public record CityPerformance(
        String city,
        long searches,
        long profileViews,
        long reservations,
        double profileToReservationRate,
        double searchToReservationRate
    ) {
    }

    /**
     * Bloque de datos professional performance dentro de la respuesta principal.
     * Agrupa metricas relacionadas para que el frontend no tenga que reconstruirlas.
     */
    public record ProfessionalPerformance(
        long professionalId,
        String professionalName,
        String professionalSlug,
        String categoryLabel,
        String city,
        long totalBookings,
        double estimatedRevenue,
        double averageTicket,
        double occupancyRate,
        double rating,
        long reviewsCount
    ) {
    }

    /**
     * Bloque de datos platform performance dentro de la respuesta principal.
     * Agrupa metricas relacionadas para que el frontend no tenga que reconstruirlas.
     */
    public record PlatformPerformance(
        String platform,
        long searches,
        long profileViews,
        long reservationFlowSessions,
        long bookings,
        long confirmedBookings,
        long completedBookings,
        long cancelledBookings,
        long noShowBookings,
        double searchToBookingRate,
        double bookingToCompletionRate
    ) {
    }

    /**
     * Bloque de datos payment type performance dentro de la respuesta principal.
     * Agrupa metricas relacionadas para que el frontend no tenga que reconstruirlas.
     */
    public record PaymentTypePerformance(
        String paymentType,
        long totalBookings,
        long confirmedBookings,
        long completedBookings,
        long cancelledBookings,
        double completionRate,
        double cancellationRate,
        double estimatedRevenue,
        double averageTicket
    ) {
    }
}
