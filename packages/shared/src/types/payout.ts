export type ProfessionalPayoutStatus = 'INCOMPLETE' | 'READY' | 'ERROR';

export type ProfessionalPayoutConfigBase = {
  status: ProfessionalPayoutStatus;
  readyToReceivePayouts: boolean;
  payoutEnabled: boolean;
  firstName?: string | null;
  lastName?: string | null;
  country?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  bank?: string | null;
  accountNumber?: string | null;
  accountType?: string | null;
  branch?: string | null;
  requiredFields?: string[] | null;
  missingFields?: string[] | null;
  invalidFields?: string[] | null;
  hasOutstandingPaidBookings: boolean;
  outstandingPaidBookingsCount: number;
};

export type ProfessionalPayoutConfigUpdateInputBase = {
  firstName: string;
  lastName: string;
  country: string;
  documentType: string;
  documentNumber: string;
  phone: string;
  bank: string;
  accountNumber: string;
  accountType: string;
  branch: string;
};
