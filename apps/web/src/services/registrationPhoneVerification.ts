import api from '@/services/api';

export type RegistrationPhoneVerificationSendResponse = {
  message: string;
  cooldownSeconds: number;
};

export type RegistrationPhoneVerificationConfirmResponse = {
  verificationToken: string;
  expiresAt: string;
};

export const sendRegistrationPhoneVerification = async (phoneNumber: string) => {
  const response = await api.post<RegistrationPhoneVerificationSendResponse>(
    '/auth/register/phone/send',
    { phoneNumber },
  );
  return response.data;
};

export const confirmRegistrationPhoneVerification = async (
  phoneNumber: string,
  code: string,
) => {
  const response = await api.post<RegistrationPhoneVerificationConfirmResponse>(
    '/auth/register/phone/confirm',
    { phoneNumber, code },
  );
  return response.data;
};
