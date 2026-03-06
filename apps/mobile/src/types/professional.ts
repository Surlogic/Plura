export type ProfessionalProfile = {
  id: string;
  slug?: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  rubro: string;
  location: string | null;
  country?: string | null;
  city?: string | null;
  fullAddress?: string | null;
  tipoCliente: string;
  publicHeadline?: string | null;
  publicAbout?: string | null;
  publicPhotos?: string[];
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
  | 'cancelled';

export type ProfessionalReservation = {
  id: string;
  serviceName: string;
  clientName: string;
  date: string;
  time: string;
  price?: string;
  duration?: string;
  status?: ReservationStatus;
  notes?: string;
};
