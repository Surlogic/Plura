import type { ProfessionalService } from '@/types/professional';

const buildStorageKey = (professionalId: string) =>
  `plura:services:${professionalId}`;

const normalizeServices = (value: unknown): ProfessionalService[] => {
  if (!Array.isArray(value)) return [];

  return value.map((service, index) => {
    const safeService = service as Partial<ProfessionalService>;
    const rawPhotos = Array.isArray(safeService.photos) ? safeService.photos : [];
    const photos = rawPhotos.map((photo, photoIndex) => {
      const safePhoto = photo as { id?: string; url?: string };
      return {
        id: safePhoto.id || `photo-${photoIndex + 1}`,
        url: safePhoto.url || '',
      };
    });

    return {
      id: safeService.id || `service-${index + 1}`,
      name: safeService.name || '',
      price: safeService.price || '',
      duration: safeService.duration || '',
      bufferTime: safeService.bufferTime || '',
      paymentType:
        safeService.paymentType === 'deposit'
          ? 'deposit'
          : safeService.paymentType === 'on_site'
            ? 'on_site'
            : 'full',
      photos,
      paused: safeService.paused === true,
    };
  });
};

export const loadProfessionalServices = (
  professionalId?: string | null,
): ProfessionalService[] => {
  if (!professionalId) return [];
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(buildStorageKey(professionalId));
  if (!raw) return [];

  try {
    return normalizeServices(JSON.parse(raw));
  } catch {
    return [];
  }
};

export const saveProfessionalServices = (
  professionalId: string,
  services: ProfessionalService[],
) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    buildStorageKey(professionalId),
    JSON.stringify(services),
  );
};

export const buildServicePreview = (
  service: ProfessionalService,
): {
  id: string;
  name: string;
  price: string;
  duration: string;
  bufferTime: string;
  paymentType: ProfessionalService['paymentType'];
  photos: string[];
} => ({
  id: service.id,
  name: service.name || 'Servicio',
  price: service.price || 'Consultar',
  duration: service.duration,
  bufferTime: service.bufferTime,
  paymentType: service.paymentType,
  photos: service.photos.map((photo) => photo.url).filter(Boolean),
});
