import api from './api';
import type {
  ProfessionalBookingPolicy,
  ProfessionalBookingPolicyUpdateInput,
} from '../types/bookings';

const BOOKING_POLICY_ENDPOINT = '/profesional/booking-policy';

export const getProfessionalBookingPolicy = async (): Promise<ProfessionalBookingPolicy> => {
  const response = await api.get<ProfessionalBookingPolicy>(BOOKING_POLICY_ENDPOINT);
  return response.data;
};

export const updateProfessionalBookingPolicy = async (
  payload: ProfessionalBookingPolicyUpdateInput,
): Promise<ProfessionalBookingPolicy> => {
  const response = await api.put<ProfessionalBookingPolicy>(BOOKING_POLICY_ENDPOINT, payload);
  return response.data;
};
