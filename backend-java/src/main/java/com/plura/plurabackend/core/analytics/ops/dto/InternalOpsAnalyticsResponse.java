package com.plura.plurabackend.core.analytics.ops.dto;

import java.util.List;

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

    public record ServicePerformance(
        String serviceId,
        String serviceName,
        String categoryLabel,
        long totalBookings,
        double estimatedRevenue,
        double averageTicket
    ) {
    }

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

    public record DemandPoint(
        String label,
        long count
    ) {
    }

    public record CityPerformance(
        String city,
        long searches,
        long profileViews,
        long reservations,
        double profileToReservationRate,
        double searchToReservationRate
    ) {
    }

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
