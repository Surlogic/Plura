import api from '@/services/api';
import type {
  MercadoPagoOAuthStartResponse,
  ProfessionalMercadoPagoConnection,
} from '@/types/professionalPaymentProviderConnection';

const BASE_PATH = '/profesional/payment-providers/mercadopago';

export const getProfessionalMercadoPagoConnection = async (): Promise<ProfessionalMercadoPagoConnection> => {
  const response = await api.get<ProfessionalMercadoPagoConnection>(`${BASE_PATH}/connection`);
  return response.data;
};

export const startProfessionalMercadoPagoOAuth = async (): Promise<MercadoPagoOAuthStartResponse> => {
  const response = await api.post<MercadoPagoOAuthStartResponse>(`${BASE_PATH}/oauth/start`);
  return response.data;
};

export const disconnectProfessionalMercadoPagoConnection = async (): Promise<ProfessionalMercadoPagoConnection> => {
  const response = await api.delete<ProfessionalMercadoPagoConnection>(`${BASE_PATH}/connection`);
  return response.data;
};
