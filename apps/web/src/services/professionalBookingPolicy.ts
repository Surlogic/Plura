import api from '@/services/api';
import { cachedGet, invalidateCachedGet } from '@/services/cachedGet';
import type {
  ProfessionalBookingPolicy,
  ProfessionalBookingPolicyUpdateInput,
} from '@/types/bookings';

const BOOKING_POLICY_ENDPOINT = '/profesional/booking-policy';

export const getProfessionalBookingPolicy = async (): Promise<ProfessionalBookingPolicy> => {
  const response = await cachedGet<ProfessionalBookingPolicy>(
    BOOKING_POLICY_ENDPOINT,
    undefined,
    {
      ttlMs: 15000,
      staleWhileRevalidate: true,
    },
  );
  return response.data;
};

export const updateProfessionalBookingPolicy = async (
  payload: ProfessionalBookingPolicyUpdateInput,
): Promise<ProfessionalBookingPolicy> => {
  const response = await api.put<ProfessionalBookingPolicy>(BOOKING_POLICY_ENDPOINT, payload);
  invalidateCachedGet(BOOKING_POLICY_ENDPOINT);
  return response.data;
};
