import type { Category } from '@/types/category';

export type ProfessionalProfile = {
  id: string;
  slug?: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  rubro: string;
  location: string | null;
  latitude?: number | null;
  longitude?: number | null;
  tipoCliente: string;
  logoUrl?: string | null;
  publicHeadline?: string | null;
  publicAbout?: string | null;
  publicPhotos?: string[];
  categories?: Category[];
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
};

export type ServicePaymentType = 'full' | 'deposit' | 'on_site';

export type ServicePhoto = {
  id: string;
  url: string;
};

export type ProfessionalService = {
  id: string;
  name: string;
  price: string;
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
  price: string;
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
  | 'cancelled';

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
  notes?: string;
};
