import type {
  ProductPlanCapabilities,
  ProductPlanCode,
} from '../../../../packages/shared/src/types/professional';

export type { ProductPlanCapabilities, ProductPlanCode };

export type ProfessionalProfile = {
  id: string;
  slug?: string;
  fullName: string;
  email: string;
  emailVerified: boolean;
  phoneNumber: string;
  phoneVerified: boolean;
  rubro: string;
  location: string | null;
  country?: string | null;
  city?: string | null;
  fullAddress?: string | null;
  tipoCliente: string;
  publicHeadline?: string | null;
  publicAbout?: string | null;
  publicPhotos?: string[];
  planCode?: ProductPlanCode;
  planCapabilities?: ProductPlanCapabilities;
};

export type ServicePaymentType =
  | 'full'
  | 'deposit'
  | 'on_site'
  | 'FULL_PREPAY'
  | 'DEPOSIT'
  | 'ON_SITE';

export type ServicePhoto = {
  id: string;
  url: string;
};

export type ProfessionalService = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  price: string;
  depositAmount?: number | null;
  currency?: string | null;
  duration: string;
  postBufferMinutes?: number;
  bufferTime: string;
  paymentType: ServicePaymentType;
  photos: ServicePhoto[];
  active?: boolean;
  paused?: boolean;
};

export type PublicService = {
  id?: string;
  name: string;
  description?: string;
  imageUrl?: string;
  price: string;
  depositAmount?: number | null;
  currency?: string | null;
  duration: string;
  postBufferMinutes?: number;
  bufferTime?: string;
  paymentType?: ServicePaymentType;
  photos?: string[];
};

export type WorkDayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type WorkShift = {
  id: string;
  start: string;
  end: string;
};

export type WorkDaySchedule = {
  day: WorkDayKey;
  enabled: boolean;
  paused: boolean;
  ranges: WorkShift[];
};

export type SchedulePauseRange = {
  id: string;
  startDate: string;
  endDate: string;
  note?: string;
};

export type ProfessionalSchedule = {
  days: WorkDaySchedule[];
  pauses: SchedulePauseRange[];
};

export type ReservationStatus =
  | 'confirmed'
  | 'pending'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type ProfessionalReservation = {
  id: string;
  serviceName: string;
  clientName: string;
  date: string;
  time: string;
  price?: string;
  duration?: string;
  postBufferMinutes?: number;
  effectiveDurationMinutes?: number;
  status?: ReservationStatus;
  serviceId?: string;
  userId?: string;
  paymentType?: 'ON_SITE' | 'DEPOSIT' | 'FULL_PREPAY' | null;
  financialSummary?: {
    financialStatus?:
      | 'NOT_REQUIRED'
      | 'PAYMENT_PENDING'
      | 'HELD'
      | 'REFUND_PENDING'
      | 'PARTIALLY_REFUNDED'
      | 'REFUNDED'
      | 'RELEASE_PENDING'
      | 'PARTIALLY_RELEASED'
      | 'RELEASED'
      | 'FAILED'
      | null;
    currency?: string | null;
  } | null;
  notes?: string;
};
