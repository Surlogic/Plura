import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import BusinessGallery from '@/components/profesional/BusinessGallery';
import ServiceDetailModal from '@/components/profesional/ServiceDetailModal';
import PublicReviewsList from '@/components/profesional/PublicReviewsList';
import Card from '@/components/ui/Card';
import { useFavoriteProfessionals } from '@/hooks/useFavoriteProfessionals';
import { mapboxForwardGeocode } from '@/services/mapbox';
import { getPublicProfessionalBySlug } from '@/services/publicBookings';
import { hasKnownAuthSession } from '@/services/session';
import {
  normalizeProfessionalMediaPresentation,
} from '@/utils/professionalMediaPresentation';
import PublicProfileHero from '@/components/profesional/public-page/PublicProfileHero';
import PublicServicesSection, {
  type PublicServiceItem,
} from '@/components/profesional/public-page/PublicServicesSection';
import {
  formatServiceDuration,
  formatServicePaymentType,
  formatServicePrice,
  resolveServiceCategoryLabel,
} from '@/components/profesional/public-page/servicePresentation';
import type {
  ProfessionalMediaPresentation,
  ProfessionalSchedule,
  PublicService,
  WorkDayKey,
} from '@/types/professional';

const PublicProfileMap = dynamic(
  () => import('@/components/profesional/PublicProfileMap'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[360px] items-center justify-center rounded-[28px] border border-[#E2E7EC] bg-[#F3F6F9] px-4 text-center text-sm text-[#64748B]">
        Cargando mapa...
      </div>
    ),
  },
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
  logoMedia?: ProfessionalMediaPresentation | null;
  bannerUrl?: string;
  bannerMedia?: ProfessionalMediaPresentation | null;
  headline?: string;
  about?: string;
  photos?: string[];
  services?: PublicService[];
  schedule?: ProfessionalSchedule;
};

const isValidMediaPresentation = (
  value: unknown,
): value is ProfessionalMediaPresentation => {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.positionX === 'number' &&
    typeof obj.positionY === 'number' &&
    typeof obj.zoom === 'number'
  );
};

const isValidPreviewPayload = (value: unknown): value is PreviewPayload => {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  if ('name' in obj && obj.name !== undefined && typeof obj.name !== 'string') return false;
  if ('category' in obj && obj.category !== undefined && typeof obj.category !== 'string') return false;
  if ('logoUrl' in obj && obj.logoUrl !== undefined && typeof obj.logoUrl !== 'string') return false;
  if ('bannerUrl' in obj && obj.bannerUrl !== undefined && typeof obj.bannerUrl !== 'string') return false;
  if ('logoMedia' in obj && obj.logoMedia !== undefined && !isValidMediaPresentation(obj.logoMedia)) return false;
  if ('bannerMedia' in obj && obj.bannerMedia !== undefined && !isValidMediaPresentation(obj.bannerMedia)) return false;
  if ('headline' in obj && obj.headline !== undefined && typeof obj.headline !== 'string') return false;
  if ('about' in obj && obj.about !== undefined && typeof obj.about !== 'string') return false;
  if (
    'photos' in obj &&
    obj.photos !== undefined &&
    (!Array.isArray(obj.photos) || !obj.photos.every((item) => typeof item === 'string'))
  ) {
    return false;
  }
  return true;
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

type SocialPlatform = 'instagram' | 'facebook' | 'tiktok' | 'website' | 'whatsapp';

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

const MapSectionPlaceholder = ({ message }: { message: string }) => (
  <div className="flex h-[360px] items-center justify-center rounded-[28px] border border-[#E2E7EC] bg-[#F3F6F9] px-6 text-center text-sm text-[#64748B]">
    {message}
  </div>
);

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

const DetailRow = ({
  href,
  label,
  value,
}: {
  href?: string;
  label: string;
  value: string;
}) => {
  if (!value) return null;

  const content = href ? (
    <a
      href={href}
      target={href.startsWith('mailto:') || href.startsWith('tel:') ? undefined : '_blank'}
      rel={href.startsWith('mailto:') || href.startsWith('tel:') ? undefined : 'noopener noreferrer'}
      className="text-sm leading-6 text-[color:var(--ink)] transition hover:text-[color:var(--primary)]"
    >
      {value}
    </a>
  ) : (
    <span className="text-sm leading-6 text-[color:var(--ink)]">{value}</span>
  );

  return (
    <div className="rounded-[18px] border border-[color:var(--border-soft)] bg-white px-4 py-3">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
        {label}
      </p>
      <div className="mt-1.5">{content}</div>
    </div>
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
  logoMedia?: ProfessionalMediaPresentation | null;
  bannerUrl?: string | null;
  bannerMedia?: ProfessionalMediaPresentation | null;
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
  rating?: number | null;
  reviewsCount?: number | null;
};

export default function ProfesionalDetailPage({
  initialData,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();
  const canResolveClientFeatures = hasKnownAuthSession();
  const { isFavorite, toggleFavorite } = useFavoriteProfessionals({
    enabled: canResolveClientFeatures,
  });

  const slug = Array.isArray(router.query.slug)
    ? router.query.slug[0]
    : router.query.slug;
  const isPreview = Array.isArray(router.query.preview)
    ? router.query.preview[0] === '1'
    : router.query.preview === '1';

  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [data, setData] = useState<PublicProfessional | null>(
    (initialData as PublicProfessional | null) ?? null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fallbackCoordinates, setFallbackCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [selectedServiceIndex, setSelectedServiceIndex] = useState(0);
  const [serviceDetailIndex, setServiceDetailIndex] = useState<number | null>(null);
  const [isMapSectionVisible, setIsMapSectionVisible] = useState(false);
  const [activeServiceCategory, setActiveServiceCategory] = useState('');
  const mapSectionRef = useRef<HTMLElement | null>(null);
  const servicesSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setData((initialData as PublicProfessional | null) ?? null);
    setErrorMessage(null);
  }, [initialData]);

  useEffect(() => {
    if (isPreview) return;
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [isPreview, slug]);

  useEffect(() => {
    if (!slug || isPreview) return;
    if (data?.slug === slug) return;

    setIsLoading(true);
    setErrorMessage(null);

    getPublicProfessionalBySlug(slug)
      .then((professional) => {
        setData(professional as PublicProfessional);
      })
      .catch(() => {
        setErrorMessage('No encontramos este profesional.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [data?.slug, isPreview, slug]);

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
      about: '',
      bannerMedia: normalizeProfessionalMediaPresentation(null),
      bannerUrl: '',
      category: '',
      email: '',
      facebook: '',
      headline: '',
      instagram: '',
      latitude: null as number | null,
      location: '',
      logoMedia: normalizeProfessionalMediaPresentation(null),
      logoUrl: '',
      longitude: null as number | null,
      name: '',
      phoneNumber: '',
      photos: [] as string[],
      schedule: null as ProfessionalSchedule | null,
      services: [] as PublicService[],
      tiktok: '',
      website: '',
      whatsapp: '',
    };

    if (!data) {
      return fallback;
    }

    return {
      ...fallback,
      about: data.about || data.description || fallback.about,
      bannerMedia: normalizeProfessionalMediaPresentation(data.bannerMedia),
      bannerUrl: data.bannerUrl || fallback.bannerUrl,
      category: data.rubro || fallback.category,
      email: data.email || fallback.email,
      facebook: data.facebook || fallback.facebook,
      headline: data.headline || fallback.headline,
      instagram: data.instagram || fallback.instagram,
      latitude: parseOptionalNumber(data.latitude ?? data.lat),
      location: data.location || data.address || fallback.location,
      logoMedia: normalizeProfessionalMediaPresentation(data.logoMedia),
      logoUrl: data.logoUrl || fallback.logoUrl,
      longitude: parseOptionalNumber(data.longitude ?? data.lng),
      name: data.fullName || data.name || fallback.name,
      phoneNumber: data.phoneNumber || data.phone || fallback.phoneNumber,
      photos: data.photos || fallback.photos,
      schedule: data.schedule ?? fallback.schedule,
      services: data.services || fallback.services,
      tiktok: data.tiktok || fallback.tiktok,
      website: data.website || fallback.website,
      whatsapp: data.whatsapp || fallback.whatsapp,
    };
  }, [data]);

  const merged = useMemo(() => {
    if (!preview) return resolved;
    return {
      ...resolved,
      about: preview.about ?? resolved.about,
      bannerMedia: preview.bannerMedia
        ? normalizeProfessionalMediaPresentation(preview.bannerMedia)
        : resolved.bannerMedia,
      bannerUrl: preview.bannerUrl ?? resolved.bannerUrl,
      category: preview.category ?? resolved.category,
      headline: preview.headline ?? resolved.headline,
      logoMedia: preview.logoMedia
        ? normalizeProfessionalMediaPresentation(preview.logoMedia)
        : resolved.logoMedia,
      logoUrl: preview.logoUrl ?? resolved.logoUrl,
      name: preview.name ?? resolved.name,
      photos: preview.photos ?? resolved.photos,
      schedule: preview.schedule ?? resolved.schedule,
    };
  }, [preview, resolved]);

  const displayServices = useMemo(
    () =>
      preview
        ? Array.isArray(preview.services)
          ? preview.services
          : []
        : Array.isArray(data?.services)
          ? data.services
          : [],
    [data?.services, preview],
  );

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

  const serviceItems = useMemo<PublicServiceItem[]>(
    () =>
      displayServices.map((service, index) => ({
        categoryLabel: resolveServiceCategoryLabel(service, merged.category),
        index,
        service,
      })),
    [displayServices, merged.category],
  );

  const serviceCategories = useMemo(
    () => Array.from(new Set(serviceItems.map((item) => item.categoryLabel))),
    [serviceItems],
  );

  useEffect(() => {
    const firstCategory = serviceCategories[0] ?? '';
    setActiveServiceCategory((current) =>
      current && serviceCategories.includes(current) ? current : firstCategory,
    );
  }, [serviceCategories]);

  useEffect(() => {
    if (!activeServiceCategory) return;
    const selectedItem = serviceItems.find((item) => item.index === selectedServiceIndex);
    if (selectedItem?.categoryLabel === activeServiceCategory) return;
    const firstItem = serviceItems.find((item) => item.categoryLabel === activeServiceCategory);
    if (firstItem) {
      setSelectedServiceIndex(firstItem.index);
    }
  }, [activeServiceCategory, selectedServiceIndex, serviceItems]);

  const selectedService = displayServices[selectedServiceIndex] ?? null;
  const serviceDetail =
    serviceDetailIndex !== null ? displayServices[serviceDetailIndex] ?? null : null;

  const displaySchedule = merged.schedule ?? null;

  const scheduleSummary = useMemo(() => {
    const scheduleDays = Array.isArray(displaySchedule?.days) ? displaySchedule.days : [];
    if (!displaySchedule || scheduleDays.length === 0) {
      return [] as { label: string; ranges: string }[];
    }

    const activeDays = scheduleDays.filter(
      (day) => day.enabled && !day.paused && (day.ranges ?? []).length > 0,
    );
    if (activeDays.length === 0) return [];

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
      const weekdays: WorkDayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri'];
      if (weekdays.every((day) => set.has(day)) && days.length === weekdays.length) {
        return 'Lun a Vie';
      }
      if (set.has('sat') && days.length === 1) return 'Sáb';
      if (set.has('sun') && days.length === 1) return 'Dom';
      if (days.length > 1) {
        return `${dayLabels[days[0]]} a ${dayLabels[days[days.length - 1]]}`;
      }
      return dayLabels[days[0]];
    };

    return orderedRanges.map((ranges) => {
      const days = buckets[ranges].sort(
        (a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b),
      );
      return {
        label: formatDayLabel(days),
        ranges,
      };
    });
  }, [displaySchedule]);

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

  const handleReserveSelectedService = (date?: string, time?: string) => {
    if (!selectedService) return;
    handleReserve(selectedService, date, time);
  };

  const handleSelectService = (index: number) => {
    setSelectedServiceIndex(index);
    const selectedItem = serviceItems.find((item) => item.index === index);
    if (selectedItem) {
      setActiveServiceCategory(selectedItem.categoryLabel);
    }
  };

  const handleReserveService = (index: number) => {
    const service = displayServices[index];
    if (!service) return;
    handleReserve(service);
  };

  const handleViewServices = () => {
    servicesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handlePrimaryReserveEntry = () => {
    if (selectedService) {
      handleReserveSelectedService();
      return;
    }
    handleViewServices();
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
    if (hasCoordinates || isPreview || !isMapSectionVisible) {
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
  }, [hasCoordinates, isMapSectionVisible, isPreview, merged.location]);

  useEffect(() => {
    const section = mapSectionRef.current;
    if (!section || typeof IntersectionObserver === 'undefined') {
      setIsMapSectionVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsMapSectionVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px 0px' },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const mapLatitude = hasCoordinates ? merged.latitude : fallbackCoordinates?.latitude;
  const mapLongitude = hasCoordinates ? merged.longitude : fallbackCoordinates?.longitude;
  const hasRenderableCoordinates =
    typeof mapLatitude === 'number' &&
    Number.isFinite(mapLatitude) &&
    typeof mapLongitude === 'number' &&
    Number.isFinite(mapLongitude);
  const canShowMap = Boolean(addressLine) && hasRenderableCoordinates;
  const shouldRenderMap = canShowMap && isMapSectionVisible;
  const addressValue = [addressLine, cityLine].filter(Boolean).join(', ');
  const phoneValue = merged.phoneNumber?.trim() || '';
  const emailValue = merged.email?.trim() || '';
  const instagramValue = merged.instagram?.trim() || '';
  const facebookValue = merged.facebook?.trim() || '';
  const tiktokValue = merged.tiktok?.trim() || '';
  const websiteValue = merged.website?.trim() || '';
  const whatsappValue = merged.whatsapp?.trim() || '';
  const hasSocial = Boolean(
    instagramValue || facebookValue || tiktokValue || websiteValue || whatsappValue,
  );
  const instagramHref = resolveSocialHref(instagramValue, 'instagram');
  const facebookHref = resolveSocialHref(facebookValue, 'facebook');
  const tiktokHref = resolveSocialHref(tiktokValue, 'tiktok');
  const websiteHref = resolveSocialHref(websiteValue, 'website');
  const whatsappHref = resolveSocialHref(whatsappValue, 'whatsapp');
  const favoriteImage = galleryPhotos[0] || merged.logoUrl || undefined;
  const locationLabel = cityLine || addressLine || merged.location || '';

  const toggleFavoriteHandler = () => {
    if (!professionalSlug) return;
    void toggleFavorite({
      category: merged.category || 'Profesional',
      headline: merged.headline || undefined,
      imageUrl: favoriteImage || undefined,
      location: merged.location || undefined,
      name: merged.name || 'Profesional',
      slug: professionalSlug,
    });
  };

  return (
    <div
      className={`min-h-screen text-[color:var(--ink)] ${
        isPreview
          ? 'bg-transparent'
          : 'bg-[linear-gradient(180deg,#f4f7f4_0%,#eef2ef_42%,#f8faf9_100%)]'
      }`}
    >
      {isPreview ? null : <Navbar />}

      <main
        className={`mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-8 ${
          isPreview ? 'pb-6 pt-6' : 'pb-36 pt-8 sm:pt-10'
        }`}
      >
        {!isPreview && isLoading ? (
          <div className="mb-6 rounded-[24px] border border-[#E2E7EC] bg-white/85 px-6 py-4 text-sm text-[#64748B]">
            Cargando información del profesional...
          </div>
        ) : null}

        {!isPreview && errorMessage ? (
          <div className="mb-6 rounded-[24px] border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-600">
            {errorMessage}
          </div>
        ) : null}

        {!isPreview && !isLoading && !errorMessage && !hasPublicContent ? (
          <div className="mb-6 rounded-[24px] border border-[#E2E7EC] bg-white/85 px-6 py-4 text-sm text-[#64748B]">
            No hay información pública cargada para este profesional.
          </div>
        ) : null}

        <PublicProfileHero
          about={merged.about}
          bannerMedia={merged.bannerMedia}
          bannerUrl={merged.bannerUrl}
          category={merged.category}
          headline={merged.headline}
          initials={initials}
          isCurrentFavorite={isCurrentFavorite}
          isPreview={isPreview}
          locationLabel={locationLabel}
          logoMedia={merged.logoMedia}
          logoUrl={merged.logoUrl}
          name={merged.name}
          onReserve={handlePrimaryReserveEntry}
          onToggleFavorite={toggleFavoriteHandler}
          onViewServices={handleViewServices}
          reserveDisabled={false}
          reserveLabel={selectedService ? 'Reservar' : 'Elegir servicio'}
          rating={data?.rating}
          reviewsCount={data?.reviewsCount}
        />
        <div className="mx-auto mt-8 max-w-[1080px] space-y-8">
          <section ref={servicesSectionRef} id="servicios">
            <PublicServicesSection
              activeCategory={activeServiceCategory}
              categories={serviceCategories}
              onCategoryChange={setActiveServiceCategory}
              onOpenServiceDetail={setServiceDetailIndex}
              onReserveService={handleReserveService}
              onSelectService={handleSelectService}
              selectedServiceIndex={selectedServiceIndex}
              serviceItems={serviceItems}
            />
          </section>

          <Card
            tone="default"
            className="overflow-hidden rounded-[32px] border-white/80 bg-white/96 p-6 shadow-[0_26px_72px_-48px_rgba(15,23,42,0.28)] sm:p-8"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[color:var(--ink-faint)]">
                  Galeria
                </p>
                <h2 className="mt-2 text-3xl font-semibold text-[color:var(--ink)]">
                  Espacio, trabajos y detalles
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--ink-muted)]">
                  Una galería más limpia, contenida y pensada para mostrar el perfil sin romper la composición.
                </p>
              </div>
              {hasRealGalleryPhotos ? (
                <p className="text-sm font-medium text-[color:var(--ink-faint)]">
                  {galleryPhotos.length} {galleryPhotos.length === 1 ? 'foto publicada' : 'fotos publicadas'}
                </p>
              ) : null}
            </div>

            <div className="mt-6 overflow-hidden rounded-[28px]">
              <BusinessGallery photos={galleryPhotos} businessName={merged.name} />
            </div>
          </Card>

          <section ref={mapSectionRef}>
            <Card
              tone="default"
              className="rounded-[32px] border-white/80 bg-white/96 p-6 shadow-[0_26px_72px_-48px_rgba(15,23,42,0.28)] sm:p-8"
            >
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[color:var(--ink-faint)]">
                  Ubicacion y horarios
                </p>
                <h2 className="mt-2 text-3xl font-semibold text-[color:var(--ink)]">
                  Informacion util antes de reservar
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--ink-muted)]">
                  Direccion, contacto y disponibilidad pública, sin mezclar selección de turnos con el perfil.
                </p>
              </div>

              <div className="mt-6 grid gap-5 xl:grid-cols-[320px,minmax(0,1fr)]">
                <div className="space-y-5">
                  <div className="rounded-[28px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] p-5">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
                      Horarios
                    </p>
                    {scheduleSummary.length > 0 ? (
                      <div className="mt-4 space-y-3">
                        {scheduleSummary.map((item, index) => (
                          <div
                            key={`${item.label}-${index}`}
                            className="rounded-[18px] border border-[color:var(--border-soft)] bg-white px-4 py-3"
                          >
                            <p className="text-sm font-semibold text-[color:var(--ink)]">
                              {item.label}
                            </p>
                            <p className="mt-1 text-sm text-[color:var(--primary)]">
                              {item.ranges}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-[18px] border border-dashed border-[color:var(--border-soft)] bg-white px-4 py-4 text-sm text-[color:var(--ink-muted)]">
                        Sin horarios publicos cargados.
                      </div>
                    )}
                  </div>

                  <div className="rounded-[28px] border border-[color:var(--border-soft)] bg-[color:var(--surface-soft)] p-5">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
                      Contacto
                    </p>
                    <div className="mt-4 space-y-3">
                      <DetailRow label="Direccion" value={addressValue} />
                      <DetailRow label="Telefono" value={phoneValue} href={phoneValue ? `tel:${phoneValue}` : undefined} />
                      <DetailRow label="Email" value={emailValue} href={emailValue ? `mailto:${emailValue}` : undefined} />
                    </div>

                    {hasSocial ? (
                      <div className="mt-5 border-t border-[color:var(--border-soft)] pt-5">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                          Redes
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {instagramValue && instagramHref ? (
                            <a
                              href={instagramHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-white text-[color:var(--ink)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]"
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
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-white text-[color:var(--ink)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]"
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
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-white text-[color:var(--ink)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]"
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
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-white text-[color:var(--ink)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]"
                              aria-label="Sitio web"
                            >
                              <SocialIcon platform="website" />
                            </a>
                          ) : null}
                          {whatsappValue && whatsappHref ? (
                            <a
                              href={whatsappHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-white text-[color:var(--ink)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]"
                              aria-label="WhatsApp"
                            >
                              <SocialIcon platform="whatsapp" />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {shouldRenderMap ? (
                  <PublicProfileMap
                    name={merged.name}
                    category={merged.category}
                    address={addressLine}
                    city={cityLine}
                    latitude={mapLatitude as number}
                    longitude={mapLongitude as number}
                    heightClassName="h-[360px]"
                  />
                ) : canShowMap ? (
                  <MapSectionPlaceholder message="Acercate a esta seccion para cargar el mapa." />
                ) : (
                  <MapSectionPlaceholder message="Ubicacion no disponible." />
                )}
              </div>
            </Card>
          </section>

          {!isPreview && professionalSlug ? (
            <Card
              tone="default"
              className="rounded-[32px] border-white/80 bg-white/96 p-6 shadow-[0_26px_72px_-48px_rgba(15,23,42,0.28)] sm:p-8"
            >
              <PublicReviewsList
                slug={professionalSlug}
                rating={data?.rating}
                reviewsCount={data?.reviewsCount}
              />
            </Card>
          ) : null}
        </div>
      </main>

      {!isPreview && selectedService ? (
        <div className="fixed inset-x-0 bottom-3 z-40 px-3 lg:hidden">
          <div className="mx-auto flex w-full max-w-[1240px] items-center gap-3 rounded-[22px] border border-[#D9E3EC] bg-white/96 px-4 py-3 shadow-[0_18px_44px_-28px_rgba(15,23,42,0.28)] backdrop-blur">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[color:var(--ink)]">
                {selectedService.name}
              </p>
              <p className="truncate text-xs text-[color:var(--ink-muted)]">
                {formatServicePrice(selectedService.price)} · {formatServiceDuration(selectedService.duration)} · {formatServicePaymentType(selectedService.paymentType)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleReserveSelectedService()}
              className="rounded-full bg-[color:var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:bg-[color:var(--primary-strong)]"
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
        onClose={() => setServiceDetailIndex(null)}
        onSelectService={() => {
          if (serviceDetailIndex === null) return;
          handleSelectService(serviceDetailIndex);
          setServiceDetailIndex(null);
        }}
      />
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const slug = Array.isArray(context.params?.slug)
    ? context.params.slug[0]
    : context.params?.slug;

  if (!slug || context.query.preview === '1') {
    return { props: { initialData: null } };
  }

  context.res.setHeader('Cache-Control', 'no-store');

  try {
    const professional = await getPublicProfessionalBySlug(slug);
    return { props: { initialData: JSON.parse(JSON.stringify(professional)) } };
  } catch {
    return { props: { initialData: null } };
  }
};
