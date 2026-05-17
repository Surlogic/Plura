import api from '@/services/api';

export type PhoneVerificationSendResponse = {
  message: string;
  cooldownSeconds: number;
};

export const sendPhoneVerification = async (phoneNumber?: string | null) => {
  const response = await api.post<PhoneVerificationSendResponse>(
    '/auth/verify/phone/send',
    phoneNumber ? { phoneNumber } : {},
  );
  return response.data;
};

export const confirmPhoneVerification = async (code: string) => {
  await api.post('/auth/verify/phone/confirm', { code });
};
