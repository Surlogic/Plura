import type { Category } from '@/types/category';
import type {
  BookingFinancialStatus,
  BookingFinancialSummary,
  BookingPaymentType,
  BookingPolicySnapshot,
  BookingPayoutRecord,
  BookingPayoutStatus,
  BookingRefundRecord,
  BookingRefundStatus,
} from '@/types/bookings';
import type {
  ProfessionalPlanCode,
  ProfessionalPlanEntitlements,
} from '../../../../packages/shared/src/types/professional';

export type { ProfessionalPlanCode, ProfessionalPlanEntitlements };

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
  latitude?: number | null;
  longitude?: number | null;
  tipoCliente: string;
  logoUrl?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  website?: string | null;
  whatsapp?: string | null;
  publicHeadline?: string | null;
  publicAbout?: string | null;
  publicPhotos?: string[];
  categories?: Category[];
  professionalPlan?: ProfessionalPlanCode;
  professionalEntitlements?: ProfessionalPlanEntitlements;
  rating?: number | null;
  reviewsCount?: number | null;
};

export type PublicProfessionalSummary = {
  id: string;
  slug: string;
  fullName: string;
  rubro: string;
  logoUrl?: string | null;
  location?: string | null;
  headline?: string | null;
  categories?: Category[];
  rating?: number | null;
  reviewsCount?: number | null;
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
  categorySlug?: string | null;
  categoryName?: string | null;
  imageUrl?: string;
  price: string;
  depositAmount?: number | null;
  currency?: string | null;
  duration: string;
  postBufferMinutes?: number;
  bufferTime: string;
  paymentType: ServicePaymentType;
  photos: ServicePhoto[];
  paused?: boolean;
};

export type PublicService = {
  id?: string;
  name: string;
  description?: string;
  categorySlug?: string | null;
  categoryName?: string | null;
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
  slotDurationMinutes?: number;
};

export type ReservationStatus =
  | 'confirmed'
  | 'pending'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type ProfessionalReservation = {
  id: string;
  userId?: string;
  serviceId?: string;
  serviceName: string;
  clientName: string;
  date: string;
  time: string;
  price?: string;
  duration?: string;
  postBufferMinutes?: number;
  effectiveDurationMinutes?: number;
  status?: ReservationStatus;
  paymentType?: BookingPaymentType | null;
  financialSummary?: BookingFinancialSummary | null;
  paymentStatus?: BookingFinancialStatus | null;
  refundStatus?: BookingRefundStatus | null;
  payoutStatus?: BookingPayoutStatus | null;
  latestRefund?: BookingRefundRecord | null;
  latestPayout?: BookingPayoutRecord | null;
  policySnapshot?: BookingPolicySnapshot | null;
  timezone?: string | null;
  startDateTimeUtc?: string | null;
  notes?: string;
};
