import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import BusinessGallery from '@/components/profesional/BusinessGallery';
import ServiceDetailModal from '@/components/profesional/ServiceDetailModal';
import FavoriteToggleButton from '@/components/shared/FavoriteToggleButton';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useFavoriteProfessionals } from '@/hooks/useFavoriteProfessionals';
import api from '@/services/api';
import { mapboxForwardGeocode } from '@/services/mapbox';
import { getPublicSlots } from '@/services/publicBookings';
import { resolveAssetUrl } from '@/utils/assetUrl';
import type {
  ProfessionalSchedule,
  PublicService,
  WorkDayKey,
} from '@/types/professional';

const PublicProfileMap = dynamic(
  () => import('@/components/profesional/PublicProfileMap'),
  { ssr: false },
);

const dayLabels: Record<WorkDayKey, string> = {
  mon: 'Lunes',
  tue: 'Martes',
  wed: 'Miércoles',
  thu: 'Jueves',
  fri: 'Viernes',
  sat: 'Sábado',
  sun: 'Domingo',
};

type PreviewPayload = {
  name?: string;
  category?: string;
  logoUrl?: string;
  headline?: string;
  about?: string;
  photos?: string[];
  services?: PublicService[];
  schedule?: ProfessionalSchedule;
};

type QuickSlotGroup = {
  label: 'Hoy' | 'Mañana';
  dateKey: string;
  slots: string[];
};

const toLocalDateKey = (daysFromToday = 0) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + daysFromToday);
  return date.toLocaleDateString('en-CA');
};

// Valida que el payload de postMessage tenga la forma esperada
const isValidPreviewPayload = (value: unknown): value is PreviewPayload => {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  if ('name' in obj && obj.name !== undefined && typeof obj.name !== 'string') return false;
  if ('category' in obj && obj.category !== undefined && typeof obj.category !== 'string') return false;
  if ('logoUrl' in obj && obj.logoUrl !== undefined && typeof obj.logoUrl !== 'string') return false;
  if ('headline' in obj && obj.headline !== undefined && typeof obj.headline !== 'string') return false;
  if ('about' in obj && obj.about !== undefined && typeof obj.about !== 'string') return false;
  if ('photos' in obj && obj.photos !== undefined && (!Array.isArray(obj.photos) || !obj.photos.every((item) => typeof item === 'string'))) return false;
  return true;
};

// Acepta solo URLs de imagen con protocolo seguro para evitar inyección CSS
const sanitizeImageSrc = (src: string): string | undefined => {
  if (!src) return undefined;
  const resolved = resolveAssetUrl(src);
  if (!resolved) return undefined;
  try {
    const baseOrigin =
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const url = new URL(resolved, baseOrigin);
    if (url.protocol === 'https:' || url.protocol === 'http:') return resolved;
    return undefined;
  } catch {
    if (resolved.startsWith('/') || resolved.startsWith('./')) return resolved;
    return undefined;
  }
};

const sanitizeExternalUrl = (value: string): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
};

const resolveSocialHref = (
  value: string | null | undefined,
  platform: SocialPlatform,
): string => {
  const trimmed = value?.trim() || '';
  if (!trimmed) return '';
  const safe = sanitizeExternalUrl(trimmed);
  if (safe) return safe;
  if (/^www\./i.test(trimmed) || /^[a-z0-9.-]+\.[a-z]{2,}/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  if (platform === 'whatsapp') {
    const digits = trimmed.replace(/[^\d]/g, '');
    if (digits.length >= 8) {
      return `https://wa.me/${digits}`;
    }
    return '';
  }
  if (platform === 'instagram' || platform === 'facebook') {
    const handle = trimmed.replace(/^@/, '').trim();
    if (/^[a-zA-Z0-9._-]{2,60}$/.test(handle)) {
      return `https://${platform}.com/${handle}`;
    }
    return '';
  }
  if (platform === 'tiktok') {
    const handle = trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
    if (/^@[a-zA-Z0-9._-]{2,60}$/.test(handle)) {
      return `https://tiktok.com/${handle}`;
    }
    return '';
  }
  return '';
};

const parseOptionalNumber = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const splitLocationLines = (location: string) => {
  const normalized = location.trim();
  if (!normalized) {
    return { addressLine: '', cityLine: '' };
  }
  const parts = normalized
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return { addressLine: '', cityLine: '' };
  }
  if (parts.length === 1) {
    return { addressLine: parts[0], cityLine: '' };
  }
  return {
    addressLine: parts[0],
    cityLine: parts.slice(1).join(', '),
  };
};

type SocialPlatform = 'instagram' | 'facebook' | 'tiktok' | 'website' | 'whatsapp';

const SocialIcon = ({ platform }: { platform: SocialPlatform }) => {
  if (platform === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
        <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3Zm-5 3.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5Zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5ZM17.75 6.5a1.25 1.25 0 1 1-1.25 1.25 1.25 1.25 0 0 1 1.25-1.25Z" />
      </svg>
    );
  }
  if (platform === 'facebook') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
        <path d="M13 22v-9h3l.5-3H13V8.3c0-.9.3-1.5 1.6-1.5H16V4.1c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 4V10H7v3h2.9v9H13Z" />
      </svg>
    );
  }
  if (platform === 'tiktok') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
        <path d="M15 3c.4 2 1.8 3.5 4 3.8v2.7c-1.6 0-3.1-.5-4.3-1.4v6.1a5.2 5.2 0 1 1-5.2-5.2c.4 0 .8 0 1.2.1v2.8a2.6 2.6 0 1 0 1.4 2.3V3H15Z" />
      </svg>
    );
  }
  if (platform === 'website') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm7.9 9h-3.1a15.4 15.4 0 0 0-1.2-5A8 8 0 0 1 19.9 11Zm-7.9 9a13.2 13.2 0 0 1-2-7 13.2 13.2 0 0 1 2-7 13.2 13.2 0 0 1 2 7 13.2 13.2 0 0 1-2 7Zm-2.6-.4A15.4 15.4 0 0 1 8.2 13H4.1a8 8 0 0 0 5.3 6.6ZM4.1 11h4.1a15.4 15.4 0 0 1 1.2-5A8 8 0 0 0 4.1 11Zm10.5 8.6a15.4 15.4 0 0 0 1.2-5h4.1a8 8 0 0 1-5.3 5Zm1.2-8.6a15.4 15.4 0 0 0-1.2-5 8 8 0 0 1 5.3 5Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.2-1.2l-.4-.2-3 .8.8-2.9-.2-.4A8 8 0 1 1 12 20Zm4.2-6c-.2-.1-1.2-.6-1.4-.7s-.3-.1-.5.1-.6.7-.7.8-.3.1-.5 0a5.8 5.8 0 0 1-1.7-1.1 6.5 6.5 0 0 1-1.2-1.5c-.1-.2 0-.3.1-.4l.3-.4a1.5 1.5 0 0 0 .2-.4.5.5 0 0 0 0-.5c0-.1-.5-1.1-.7-1.5s-.4-.3-.5-.3h-.4a.8.8 0 0 0-.6.3 2.4 2.4 0 0 0-.8 1.8 4 4 0 0 0 .9 2.2 9.1 9.1 0 0 0 3.4 3 11.3 11.3 0 0 0 1.1.4 2.7 2.7 0 0 0 1.2.1 2 2 0 0 0 1.3-.9 1.6 1.6 0 0 0 .1-.9c0-.1-.2-.2-.4-.3Z" />
    </svg>
  );
};

type PublicProfessional = {
  id: string;
  slug: string;
  name?: string;
  fullName: string;
  rubro: string;
  description?: string | null;
  logoUrl?: string | null;
  headline?: string | null;
  about?: string | null;
  address?: string | null;
  location?: string | null;
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
  photos?: string[];
  services?: PublicService[];
  schedule?: ProfessionalSchedule;
};

export default function ProfesionalDetailPage() {
  const router = useRouter();
  const { isFavorite, toggleFavorite } = useFavoriteProfessionals();
  const slug = Array.isArray(router.query.slug)
    ? router.query.slug[0]
    : router.query.slug;
  const isPreview = Array.isArray(router.query.preview)
    ? router.query.preview[0] === '1'
    : router.query.preview === '1';
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [data, setData] = useState<PublicProfessional | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fallbackCoordinates, setFallbackCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [selectedServiceIndex, setSelectedServiceIndex] = useState(0);
  const [serviceDetailIndex, setServiceDetailIndex] = useState<number | null>(null);
  const [quickSlotGroups, setQuickSlotGroups] = useState<QuickSlotGroup[]>([]);
  const [isLoadingQuickSlots, setIsLoadingQuickSlots] = useState(false);

  useEffect(() => {
    if (isPreview) return;
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [isPreview, slug]);

  useEffect(() => {
    if (!slug || isPreview) return;
    setIsLoading(true);
    setErrorMessage(null);

    api
      .get(`/public/profesionales/${slug}`)
      .then((response) => {
        const professional = response.data as PublicProfessional;
        setData(professional);
      })
      .catch(() => {
        setErrorMessage('No encontramos este profesional.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [slug, isPreview]);

  useEffect(() => {
    if (!isPreview) return;
    if (typeof window === 'undefined') return;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!event.data || event.data.type !== 'plura-preview') return;
      if (!isValidPreviewPayload(event.data.payload)) return;
      setPreview(event.data.payload);
    };

    window.addEventListener('message', handleMessage);
    window.parent.postMessage({ type: 'plura-preview-ready' }, window.location.origin);

    return () => window.removeEventListener('message', handleMessage);
  }, [isPreview]);

  const resolved = useMemo(() => {
    const fallback = {
      name: '',
      category: '',
      logoUrl: '',
      location: '',
      headline: '',
      about: '',
      email: '',
      phoneNumber: '',
      instagram: '',
      facebook: '',
      tiktok: '',
      website: '',
      whatsapp: '',
      latitude: null as number | null,
      longitude: null as number | null,
      photos: [],
      services: [] as PublicService[],
      schedule: null as ProfessionalSchedule | null,
    };

    if (!data) {
      return fallback;
    }

    return {
      ...fallback,
      name: data.fullName || data.name || fallback.name,
      category: data.rubro || fallback.category,
      logoUrl: data.logoUrl || fallback.logoUrl,
      headline: data.headline || fallback.headline,
      about: data.about || data.description || fallback.about,
      location: data.location || data.address || fallback.location,
      email: data.email || fallback.email,
      phoneNumber: data.phoneNumber || data.phone || fallback.phoneNumber,
      instagram: data.instagram || fallback.instagram,
      facebook: data.facebook || fallback.facebook,
      tiktok: data.tiktok || fallback.tiktok,
      website: data.website || fallback.website,
      whatsapp: data.whatsapp || fallback.whatsapp,
      latitude: parseOptionalNumber(data.latitude ?? data.lat),
      longitude: parseOptionalNumber(data.longitude ?? data.lng),
      photos: data.photos || fallback.photos,
      services: data.services || fallback.services,
      schedule: data.schedule ?? fallback.schedule,
    };
  }, [data]);

  const merged = useMemo(() => {
    if (!preview) return resolved;
    return {
      ...resolved,
      name: preview.name ?? resolved.name,
      category: preview.category ?? resolved.category,
      logoUrl: preview.logoUrl ?? resolved.logoUrl,
      headline: preview.headline ?? resolved.headline,
      about: preview.about ?? resolved.about,
      photos: preview.photos ?? resolved.photos,
      schedule: preview.schedule ?? resolved.schedule,
    };
  }, [resolved, preview]);

  const displayServices = preview
    ? Array.isArray(preview.services)
      ? preview.services
      : []
    : Array.isArray(data?.services)
      ? data.services
      : [];
  const selectedService = displayServices[selectedServiceIndex] ?? null;
  const serviceDetail = serviceDetailIndex !== null
    ? displayServices[serviceDetailIndex] ?? null
    : null;

  useEffect(() => {
    if (displayServices.length === 0) {
      setSelectedServiceIndex(0);
      setServiceDetailIndex(null);
      return;
    }
    if (selectedServiceIndex >= displayServices.length) {
      setSelectedServiceIndex(0);
    }
    if (serviceDetailIndex !== null && serviceDetailIndex >= displayServices.length) {
      setServiceDetailIndex(null);
    }
  }, [displayServices.length, selectedServiceIndex, serviceDetailIndex]);

  const displaySchedule = merged.schedule ?? null;
  const scheduleDays = Array.isArray(displaySchedule?.days)
    ? displaySchedule?.days
    : [];

  const scheduleSummary = useMemo(() => {
    if (!displaySchedule || scheduleDays.length === 0) {
      return [] as { label: string; ranges: string }[];
    }

    const activeDays = scheduleDays.filter(
      (day) => day.enabled && !day.paused && (day.ranges ?? []).length > 0,
    );
    if (activeDays.length === 0) return [];

    const group: {
      label: string;
      ranges: string;
    }[] = [];

    const buckets: Record<string, WorkDayKey[]> = {};
    activeDays.forEach((day) => {
      const ranges = (day.ranges ?? [])
        .map((range) => `${range.start} - ${range.end}`)
        .join(' · ');
      if (!buckets[ranges]) buckets[ranges] = [];
      buckets[ranges].push(day.day);
    });

    const dayOrder: WorkDayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const orderedRanges = Object.keys(buckets).sort((a, b) => {
      const firstDayA = dayOrder.indexOf(buckets[a][0]);
      const firstDayB = dayOrder.indexOf(buckets[b][0]);
      return firstDayA - firstDayB;
    });

    const formatDayLabel = (days: WorkDayKey[]) => {
      const set = new Set(days);
      if (set.has('mon') && set.has('fri') && days.length >= 5) {
        
        const weekdays: WorkDayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri'];
        
        if (weekdays.every((day) => set.has(day)) && days.length === 5) {
          return 'Lun a Vie';
        }
      }
      if (set.has('sat') && days.length === 1) return 'Sáb';
      if (set.has('sun') && days.length === 1) return 'Dom';
      if (days.length > 1) {
        const first = dayLabels[days[0]];
        const last = dayLabels[days[days.length - 1]];
        return `${first} a ${last}`;
      }
      return dayLabels[days[0]];
    };

    const formatRangeLabel = (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return '';
      if (/[^0-9]/.test(trimmed)) return trimmed;
      const minutes = Number(trimmed);
      if (!Number.isFinite(minutes)) return trimmed;
      if (minutes < 60) return `${minutes} min`;
      const hours = Math.floor(minutes / 60);
      const remaining = Math.round(minutes % 60);
      if (remaining === 0) return `${hours} h`;
      return `${hours} h ${remaining} min`;
    };

    orderedRanges.forEach((ranges) => {
      const parsedRanges = ranges
        .split('·')
        .map((segment) => segment.trim())
        .filter(Boolean)
        .map((segment) => {
          const [start, end] = segment.split('-').map((part) => part.trim());
          if (!start || !end) return segment;
          return `${formatRangeLabel(start)} - ${formatRangeLabel(end)}`;
        })
        .join(' · ');
      const days = buckets[ranges].sort(
        (a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b),
      );
      group.push({ label: formatDayLabel(days), ranges: parsedRanges });
    });

    return group;
  }, [displaySchedule, scheduleDays]);

  const formatServiceDuration = (value?: string) => {
    if (!value) return 'Duración a definir';
    const trimmed = value.trim();
    if (!trimmed) return 'Duración a definir';
    if (/[a-zA-Z]/.test(trimmed)) return trimmed;
    const minutes = Number(trimmed);
    if (!Number.isFinite(minutes)) return trimmed;
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remaining = Math.round(minutes % 60);
    if (remaining === 0) return `${hours} h`;
    return `${hours} h ${remaining} min`;
  };

  const formatServicePrice = (value?: string) => {
    if (!value) return 'Consultar';
    const trimmed = value.trim();
    if (!trimmed) return 'Consultar';
    if (trimmed.includes('$')) return trimmed;
    return `$${trimmed}`;
  };

  const formatServicePaymentType = (value?: string) => {
    const normalized = (value || '').trim().toUpperCase();
    if (normalized === 'DEPOSIT') return 'Seña online';
    if (normalized === 'FULL_PREPAY' || normalized === 'FULL') return 'Pago total online';
    return 'Pago en el lugar';
  };

  const resolveServiceCategoryLabel = (service?: PublicService | null) => {
    const serviceCategory = service?.categoryName?.trim();
    if (serviceCategory) return serviceCategory;
    return merged.category.trim();
  };

  const initials = useMemo(
    () =>
      merged.name
        ? merged.name
            .split(' ')
            .map((part) => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()
        : '',
    [merged.name],
  );

  const serviceGalleryPhotos = useMemo(
    () =>
      displayServices
        .flatMap((service) => {
          const galleryPhotos = Array.isArray(service.photos) ? service.photos : [];
          return service.imageUrl ? [service.imageUrl, ...galleryPhotos] : galleryPhotos;
        })
        .filter(Boolean),
    [displayServices],
  );

  const galleryPhotos = useMemo(() => {
    const localPhotos = merged.photos ?? [];
    const combined = [...localPhotos, ...serviceGalleryPhotos];
    return Array.from(new Set(combined.filter(Boolean))).slice(0, 15);
  }, [merged.photos, serviceGalleryPhotos]);
  const hasRealGalleryPhotos = galleryPhotos.some((photo) => Boolean(photo));

  const professionalSlug = typeof slug === 'string' ? slug : '';
  const isCurrentFavorite = isFavorite(professionalSlug);

  useEffect(() => {
    if (isPreview || !professionalSlug || !selectedService?.id) {
      setQuickSlotGroups([]);
      setIsLoadingQuickSlots(false);
      return;
    }

    let cancelled = false;
    const todayKey = toLocalDateKey(0);
    const tomorrowKey = toLocalDateKey(1);

    setIsLoadingQuickSlots(true);
    Promise.all([
      getPublicSlots(professionalSlug, todayKey, selectedService.id).catch(() => []),
      getPublicSlots(professionalSlug, tomorrowKey, selectedService.id).catch(() => []),
    ])
      .then(([todaySlots, tomorrowSlots]) => {
        if (cancelled) return;
        setQuickSlotGroups([
          { label: 'Hoy', dateKey: todayKey, slots: todaySlots.slice(0, 3) },
          { label: 'Mañana', dateKey: tomorrowKey, slots: tomorrowSlots.slice(0, 3) },
        ]);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingQuickSlots(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isPreview, professionalSlug, selectedService?.id]);

  const handleReserve = (service: PublicService, date?: string, time?: string) => {
    const params = new URLSearchParams();
    if (service.id) params.set('serviceId', service.id);
    if (service.name) params.set('servicio', service.name);
    if (professionalSlug) params.set('profesional', professionalSlug);
    if (date) params.set('date', date);
    if (time) params.set('time', time);
    const query = params.toString();
    router.push(query ? `/reservar?${query}` : '/reservar');
  };

  const openServiceDetail = (index: number) => {
    setServiceDetailIndex(index);
  };

  const closeServiceDetail = () => {
    setServiceDetailIndex(null);
  };

  const handleSelectServiceFromDetail = () => {
    if (serviceDetailIndex === null) return;
    setSelectedServiceIndex(serviceDetailIndex);
    setServiceDetailIndex(null);
  };

  const hasPublicContent = Boolean(
    merged.name ||
      merged.headline ||
      merged.category ||
      merged.logoUrl ||
      merged.about ||
      (Array.isArray(merged.photos) && merged.photos.some(Boolean)) ||
      displayServices.length > 0,
  );

  const { addressLine, cityLine } = useMemo(
    () => splitLocationLines(merged.location || ''),
    [merged.location],
  );
  const hasCoordinates =
    typeof merged.latitude === 'number' &&
    Number.isFinite(merged.latitude) &&
    typeof merged.longitude === 'number' &&
    Number.isFinite(merged.longitude);
  useEffect(() => {
    if (hasCoordinates || isPreview) {
      setFallbackCoordinates(null);
      return;
    }
    const location = (merged.location || '').trim();
    if (!location) {
      setFallbackCoordinates(null);
      return;
    }

    let cancelled = false;
    mapboxForwardGeocode(location)
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          setFallbackCoordinates(null);
          return;
        }
        setFallbackCoordinates({
          latitude: result.latitude,
          longitude: result.longitude,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setFallbackCoordinates(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hasCoordinates, isPreview, merged.location]);

  const mapLatitude = hasCoordinates ? merged.latitude : fallbackCoordinates?.latitude;
  const mapLongitude = hasCoordinates ? merged.longitude : fallbackCoordinates?.longitude;
  const hasRenderableCoordinates =
    typeof mapLatitude === 'number' &&
    Number.isFinite(mapLatitude) &&
    typeof mapLongitude === 'number' &&
    Number.isFinite(mapLongitude);
  const canShowMap = Boolean(addressLine) && hasRenderableCoordinates;
  const profile = merged;
  const addressValue = [addressLine, cityLine].filter(Boolean).join(', ');
  const phoneValue = profile.phoneNumber?.trim() || '';
  const emailValue = profile.email?.trim() || '';
  const instagramValue = profile.instagram?.trim() || '';
  const facebookValue = profile.facebook?.trim() || '';
  const tiktokValue = profile.tiktok?.trim() || '';
  const websiteValue = profile.website?.trim() || '';
  const whatsappValue = profile.whatsapp?.trim() || '';
  const hasSocial = Boolean(
    profile.instagram ||
      profile.facebook ||
      profile.tiktok ||
      profile.website ||
      profile.whatsapp,
  );
  const instagramHref = resolveSocialHref(instagramValue, 'instagram');
  const facebookHref = resolveSocialHref(facebookValue, 'facebook');
  const tiktokHref = resolveSocialHref(tiktokValue, 'tiktok');
  const websiteHref = resolveSocialHref(websiteValue, 'website');
  const whatsappHref = resolveSocialHref(whatsappValue, 'whatsapp');
  const favoriteImage = galleryPhotos[0] || merged.logoUrl || undefined;

  return (
    <div
      className={`min-h-screen text-[#0E2A47] ${
        isPreview
          ? 'bg-transparent'
          : 'bg-[radial-gradient(1200px_640px_at_10%_-10%,rgba(31,182,166,0.18),transparent_55%),radial-gradient(900px_520px_at_100%_0%,rgba(242,140,56,0.14),transparent_50%),linear-gradient(180deg,#edf3f1_0%,#e4eaee_100%)]'
      }`}
    >
      {isPreview ? null : <Navbar />}
      <main
        className={`mx-auto w-full max-w-[1100px] px-4 sm:px-6 lg:px-10 ${
          isPreview ? 'pb-6 pt-6' : 'pb-32 pt-10'
        }`}
      >
        {!isPreview && isLoading ? (
          <div className="mb-6 rounded-[24px] border border-[#E2E7EC] bg-white/80 px-6 py-4 text-sm text-[#64748B]">
            Cargando información del profesional...
          </div>
        ) : null}
        {!isPreview && errorMessage ? (
          <div className="mb-6 rounded-[24px] border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-600">
            {errorMessage}
          </div>
        ) : null}
        {!isPreview && !isLoading && !errorMessage && !hasPublicContent ? (
          <div className="mb-6 rounded-[24px] border border-[#E2E7EC] bg-white/80 px-6 py-4 text-sm text-[#64748B]">
            No hay información pública cargada para este profesional.
          </div>
        ) : null}
        <Card tone="glass" padding="none" className="overflow-hidden rounded-[36px] border-white/80">
          <div className="h-32 bg-[linear-gradient(120deg,#0B1D2A,#145E63,#BFEDE7)] sm:h-40 lg:h-52" />
          <div className="relative -mt-10 px-6 pb-8 sm:-mt-12 lg:-mt-14">
            <Card tone="glass" className="flex flex-col gap-6 rounded-[30px] border-white/80 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex items-center gap-5">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-[color:var(--accent)] bg-white text-base font-semibold text-[color:var(--ink)]">
                  {(() => {
                    const safeLogoSrc = merged.logoUrl ? sanitizeImageSrc(merged.logoUrl) : undefined;
                    if (!safeLogoSrc) return initials;
                    return (
                      <img
                        src={safeLogoSrc}
                        alt={`Logo de ${merged.name || 'profesional'}`}
                        className="h-full w-full object-cover"
                      />
                    );
                  })()}
                </div>
                <div className="space-y-1">
                  <p className="text-[0.7rem] uppercase tracking-[0.4em] text-[color:var(--ink-faint)]">
                    Profesional / Empresa
                  </p>
                  <h1 className="text-3xl font-semibold text-[color:var(--ink)] sm:text-4xl">
                    {merged.name}
                  </h1>
                  <p className="text-sm text-[color:var(--ink-muted)] sm:text-base">{merged.headline}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="neutral" className="normal-case tracking-normal">4.9 (120 reseñas)</Badge>
                    <Badge variant="accent" className="normal-case tracking-normal">Confirmación inmediata</Badge>
                  </div>
                </div>
              </div>

              <div className="w-full space-y-3 lg:w-64">
                {merged.category ? (
                  <Card tone="soft" className="rounded-[20px] px-4 py-3">
                    <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[color:var(--ink-faint)]">
                      Rubro
                    </p>
                    <p className="text-sm font-semibold text-[color:var(--ink)]">
                      {merged.category}
                    </p>
                  </Card>
                ) : null}
                <FavoriteToggleButton
                  isActive={isCurrentFavorite}
                  onClick={() => {
                    if (!professionalSlug) return;
                    void toggleFavorite({
                      slug: professionalSlug,
                      name: merged.name || 'Profesional',
                      category: merged.category || 'Profesional',
                      location: merged.location || undefined,
                      imageUrl: favoriteImage || undefined,
                      headline: merged.headline || undefined,
                    });
                  }}
                  variant="pill"
                  activeLabel="Guardado en favoritos"
                  inactiveLabel="Guardar en favoritos"
                  className="w-full justify-center"
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (selectedService) {
                      handleReserve(selectedService);
                    }
                  }}
                  disabled={!selectedService}
                  variant="primary"
                  className={`w-full ${!selectedService ? 'cursor-not-allowed border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] text-[color:var(--ink-faint)] shadow-none' : ''}`}
                >
                  Reservar turno
                </Button>
              </div>
            </Card>
          </div>
        </Card>

        <Card tone="glass" className="mt-8 px-6 py-7 sm:px-8">
          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[color:var(--ink-faint)]">Galeria</p>
          <h2 className="mt-2 text-2xl font-semibold">Fotos del local, trabajos y servicios</h2>
          <div className="mt-5">
            <BusinessGallery photos={galleryPhotos} businessName={merged.name} />
          </div>
          {hasRealGalleryPhotos ? (
            <p className="mt-3 text-xs text-[color:var(--ink-faint)]">
              Mostrando {Math.min(galleryPhotos.length, 6)} de {galleryPhotos.length} fotos.
            </p>
          ) : null}
        </Card>

        <Card tone="glass" className="mt-10 px-6 py-8 sm:px-8">
          <section>
            <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[color:var(--ink-faint)]">Servicios</p>
            <h2 className="mt-2 text-2xl font-semibold">Seleccioná tu servicio</h2>
            {displayServices.length === 0 ? (
              <p className="mt-4 text-sm text-[color:var(--ink-muted)]">No hay servicios cargados todavía.</p>
            ) : (
              <div className="mt-6 divide-y divide-[#E6EBF0]">
                {displayServices.map((service, index) => (
                  <div
                    key={service.id ?? service.name ?? `service-${index}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedServiceIndex(index)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedServiceIndex(index);
                      }
                    }}
                    className={`grid w-full gap-3 py-4 text-left transition sm:grid-cols-[32px_56px_minmax(0,1fr)_140px_120px] sm:items-center ${
                      selectedServiceIndex === index ? 'bg-[color:var(--accent-soft)]/45' : ''
                    }`}
                  >
                    <span className="mt-1 flex h-5 w-5 items-center justify-center rounded-full border border-[#C7D1DB]">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          selectedServiceIndex === index ? 'bg-[color:var(--primary-strong)]' : 'bg-transparent'
                        }`}
                      />
                    </span>
                    <div className="h-14 w-14 overflow-hidden rounded-[12px] border border-[#D9E2EC] bg-white">
                      {service.imageUrl && sanitizeImageSrc(service.imageUrl) ? (
                        <img
                          src={sanitizeImageSrc(service.imageUrl)}
                          alt={service.name || 'Servicio'}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-[#94A3B8]">
                          Sin foto
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-[#0E2A47]">{service.name}</p>
                      {service.description ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-[#64748B]">
                          {service.description}
                        </p>
                      ) : null}
                      {resolveServiceCategoryLabel(service) ? (
                        <p className="mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                          {resolveServiceCategoryLabel(service)}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                        {formatServicePaymentType(service.paymentType)}
                      </p>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openServiceDetail(index);
                        }}
                        className="mt-1 rounded-full border border-[#D9E2EC] bg-white px-2.5 py-1 text-[0.68rem] font-semibold text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-sm"
                      >
                        Ver info
                      </button>
                    </div>
                    <p className="text-sm text-[color:var(--ink-muted)]">{formatServiceDuration(service.duration)}</p>
                    <p className="text-base font-semibold text-[color:var(--accent-strong)]">{formatServicePrice(service.price)}</p>
                  </div>
                ))}
              </div>
            )}
            {displayServices.length > 0 ? (
              <Button
                type="button"
                onClick={() => {
                  if (selectedService) {
                    handleReserve(selectedService);
                  }
                }}
                disabled={!selectedService}
                variant="primary"
                className={`mt-6 ${!selectedService ? 'cursor-not-allowed border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] text-[color:var(--ink-faint)] shadow-none' : ''}`}
              >
                Continuar
              </Button>
            ) : null}
          </section>

          <section className="mt-10 border-t border-[#E6EBF0] pt-10">
            <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[color:var(--ink-faint)]">Próximos turnos</p>
            <h2 className="mt-2 text-2xl font-semibold">Próximos turnos disponibles</h2>
            {isPreview ? (
              <p className="mt-4 text-sm text-[color:var(--ink-muted)]">Disponible al publicar la página.</p>
            ) : isLoadingQuickSlots ? (
              <p className="mt-4 text-sm text-[color:var(--ink-muted)]">Buscando horarios...</p>
            ) : quickSlotGroups.every((group) => group.slots.length === 0) ? (
              <p className="mt-4 text-sm text-[color:var(--ink-muted)]">No hay turnos próximos para este servicio.</p>
            ) : (
              <div className="mt-5 space-y-5">
                {quickSlotGroups.map((group) => (
                  <div key={group.dateKey}>
                    <p className="text-sm font-semibold text-[#0E2A47]">{group.label}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {group.slots.length > 0 ? (
                        group.slots.map((slot) => (
                          <button
                            key={`${group.dateKey}-${slot}`}
                            type="button"
                            onClick={() => {
                              if (selectedService) {
                                handleReserve(selectedService, group.dateKey, slot);
                              }
                            }}
                            className="rounded-full border border-[color:var(--border-soft)] bg-white px-3 py-1.5 text-sm font-semibold text-[color:var(--ink)] transition hover:-translate-y-0.5 hover:border-[color:var(--border-strong)] hover:shadow-sm"
                          >
                            {slot}
                          </button>
                        ))
                      ) : (
                        <span className="text-sm text-[#94A3B8]">Sin turnos</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {scheduleSummary.length > 0 ? (
            <section className="mt-10 border-t border-[#E6EBF0] pt-10">
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[color:var(--ink-faint)]">Horarios</p>
              <h2 className="mt-2 text-2xl font-semibold">Horarios de atención</h2>
              <div className="mt-5 space-y-2">
                {scheduleSummary.map((item, index) => (
                  <div
                    key={`${item.label}-${index}`}
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEF2F6] py-2 text-sm text-[#0E2A47]"
                  >
                    <span className="font-medium">{item.label}</span>
                    <span className="font-semibold text-[#1FB6A6]">{item.ranges}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="mt-10 border-t border-[#E6EBF0] pt-10">
            <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">Sobre</p>
            <h2 className="mt-2 text-2xl font-semibold">Sobre el local o profesional</h2>
            {merged.about ? (
              <p className="mt-4 text-sm leading-relaxed text-[#64748B]">{merged.about}</p>
            ) : (
              <p className="mt-4 text-sm text-[#64748B]">Sin descripción cargada.</p>
            )}
          </section>

          <section className="mt-10 border-t border-[#E6EBF0] pt-10">
            <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">Ubicación</p>
            <h2 className="mt-2 text-2xl font-semibold">Datos, ubicación y mapa</h2>
            <div className="mt-5 grid gap-6 lg:grid-cols-[280px,1fr]">
              <div className="text-sm text-[#64748B]">
                <p className="font-semibold text-[#0E2A47]">Contacto</p>
                {addressValue || phoneValue || emailValue ? (
                  <div className="mt-2 space-y-2">
                    {addressValue ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex min-w-[1.8rem] justify-center text-sm">📍</span>
                        <span className="text-sm text-[#475569]">{addressValue}</span>
                      </div>
                    ) : null}
                    {phoneValue ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex min-w-[1.8rem] justify-center text-sm">📞</span>
                        <span className="text-sm text-[#475569]">{phoneValue}</span>
                      </div>
                    ) : null}
                    {emailValue ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex min-w-[1.8rem] justify-center text-sm">✉️</span>
                        <span className="text-sm text-[#475569]">{emailValue}</span>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-1">-</p>
                )}

                {hasSocial ? (
                  <>
                    <p className="mt-6 font-semibold text-[#0E2A47]">Redes</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {instagramValue && instagramHref ? (
                        <a
                          href={instagramHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#D9E2EC] bg-white text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-sm"
                          title="Instagram"
                          aria-label="Instagram"
                        >
                          <SocialIcon platform="instagram" />
                        </a>
                      ) : null}
                      {facebookValue && facebookHref ? (
                        <a
                          href={facebookHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#D9E2EC] bg-white text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-sm"
                          title="Facebook"
                          aria-label="Facebook"
                        >
                          <SocialIcon platform="facebook" />
                        </a>
                      ) : null}
                      {tiktokValue && tiktokHref ? (
                        <a
                          href={tiktokHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#D9E2EC] bg-white text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-sm"
                          title="TikTok"
                          aria-label="TikTok"
                        >
                          <SocialIcon platform="tiktok" />
                        </a>
                      ) : null}
                      {websiteValue && websiteHref ? (
                        <a
                          href={websiteHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#D9E2EC] bg-white text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-sm"
                          title="Website"
                          aria-label="Website"
                        >
                          <SocialIcon platform="website" />
                        </a>
                      ) : null}
                      {whatsappValue && whatsappHref ? (
                        <a
                          href={whatsappHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#D9E2EC] bg-white text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-sm"
                          title="WhatsApp"
                          aria-label="WhatsApp"
                        >
                          <SocialIcon platform="whatsapp" />
                        </a>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </div>
              {canShowMap ? (
                <PublicProfileMap
                  name={merged.name}
                  category={merged.category}
                  address={addressLine}
                  city={cityLine}
                  latitude={mapLatitude as number}
                  longitude={mapLongitude as number}
                />
              ) : (
                <div className="flex h-80 items-center justify-center rounded-2xl bg-[#E7EDF2] px-4 text-center text-sm text-[#64748B]">
                  Ubicación no disponible
                </div>
              )}
            </div>
          </section>
        </Card>
      </main>
      {!isPreview && selectedService ? (
        <div className="fixed inset-x-0 bottom-3 z-40 px-3 sm:px-6">
          <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-3 rounded-2xl border border-[#D9E3EC] bg-white/95 px-4 py-3 shadow-[0_16px_40px_rgba(15,23,42,0.16)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#0E2A47]">
                {selectedService.name}
              </p>
              <p className="text-xs text-[#64748B]">
                {formatServicePrice(selectedService.price)} · {formatServiceDuration(selectedService.duration)} · {formatServicePaymentType(selectedService.paymentType)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleReserve(selectedService)}
              className="rounded-full bg-[#0B1D2A] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              Reservar
            </button>
          </div>
        </div>
      ) : null}
      {isPreview ? null : <Footer />}
      <ServiceDetailModal
        isOpen={serviceDetailIndex !== null}
        service={serviceDetail}
        fallbackCategoryName={merged.category}
        onClose={closeServiceDetail}
        onSelectService={handleSelectServiceFromDetail}
      />
    </div>
  );
}
