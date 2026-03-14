import api from '@/services/api';

export type ProfessionalAnalyticsView = 'BASIC' | 'ADVANCED';

export type ProfessionalAnalyticsSummary = {
  todayBookings: number;
  yesterdayBookings: number;
  todayDelta: number;
  weeklyUniqueClients: number;
  weeklyScheduledDays: number;
  weeklyDaysWithReservations: number;
  weeklyOccupancyRate: number;
  completedBookings?: number | null;
  cancelledBookings?: number | null;
  noShowBookings?: number | null;
};

export const getProfessionalAnalyticsSummary = async (
  view: ProfessionalAnalyticsView = 'BASIC',
): Promise<ProfessionalAnalyticsSummary> => {
  const response = await api.get<ProfessionalAnalyticsSummary>('/profesional/analytics/summary', {
    params: { view },
  });
  return response.data;
};
