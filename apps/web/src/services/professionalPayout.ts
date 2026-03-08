import api from '@/services/api';
import type {
  ProfessionalPayoutConfig,
  ProfessionalPayoutConfigUpdateInput,
} from '@/types/payout';

export const getProfessionalPayoutConfig = async (): Promise<ProfessionalPayoutConfig> => {
  const response = await api.get<ProfessionalPayoutConfig>('/profesional/payout-config');
  return response.data;
};

export const updateProfessionalPayoutConfig = async (
  payload: ProfessionalPayoutConfigUpdateInput,
): Promise<ProfessionalPayoutConfig> => {
  const response = await api.put<ProfessionalPayoutConfig>('/profesional/payout-config', payload);
  return response.data;
};
