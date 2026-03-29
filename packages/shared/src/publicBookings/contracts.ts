export type PublicBookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED';

export type PublicMediaPresentation = {
  positionX: number;
  positionY: number;
  zoom: number;
};

export type PublicBookingRequest = {
  serviceId: string;
  startDateTime: string;
};

export type PublicBookingResponseBase = {
  id: number;
  status: PublicBookingStatus;
  startDateTime: string;
  startDateTimeUtc?: string | null;
  timezone?: string | null;
  serviceId: string;
  professionalId: string;
  userId: string;
};

export type PublicProfessionalServiceBase<TPaymentType = string> = {
  id: string;
  name: string;
  description?: string;
  categorySlug?: string | null;
  categoryName?: string | null;
  imageUrl?: string;
  price?: string;
  depositAmount?: number | null;
  currency?: string | null;
  paymentType?: TPaymentType;
  duration?: string;
  postBufferMinutes?: number;
};

export type PublicProfessionalPageBase<
  TPaymentType = string,
  TCategory = unknown,
  TSchedule = unknown,
  TBookingPolicy = unknown,
> = {
  id: string;
  slug: string;
  name?: string;
  fullName: string;
  rubro?: string;
  description?: string | null;
  headline?: string | null;
  about?: string | null;
  logoUrl?: string | null;
  logoMedia?: PublicMediaPresentation | null;
  bannerUrl?: string | null;
  bannerMedia?: PublicMediaPresentation | null;
  categories?: TCategory[];
  address?: string | null;
  location?: string | null;
  country?: string | null;
  city?: string | null;
  fullAddress?: string | null;
  lat?: number | null;
  lng?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  email?: string | null;
  phone?: string | null;
  phoneNumber?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  website?: string | null;
  whatsapp?: string | null;
  schedule?: TSchedule;
  services: PublicProfessionalServiceBase<TPaymentType>[];
  bookingPolicy?: TBookingPolicy | null;
  rating?: number | null;
  reviewsCount?: number | null;
};

export type PublicProfessionalSummary = {
  id: string;
  slug: string;
  fullName: string;
  rubro?: string;
  location?: string;
  headline?: string;
  logoUrl?: string | null;
};

export const normalizePublicProfessionalPage = <
  TPaymentType = string,
  TCategory = unknown,
  TSchedule = unknown,
  TBookingPolicy = unknown,
>(
  payload: PublicProfessionalPageBase<TPaymentType, TCategory, TSchedule, TBookingPolicy>,
): PublicProfessionalPageBase<TPaymentType, TCategory, TSchedule, TBookingPolicy> => ({
  ...payload,
  services: Array.isArray(payload.services) ? payload.services : [],
});

export const normalizePublicProfessionalSummaries = (
  payload: unknown,
): PublicProfessionalSummary[] => (Array.isArray(payload) ? payload : []);

export const normalizePublicSlots = (payload: unknown): string[] => (
  Array.isArray(payload) ? payload : []
);
