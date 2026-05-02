import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import BusinessGallery from '@/components/profesional/BusinessGallery';
import ServiceDetailModal from '@/components/profesional/ServiceDetailModal';
import PublicReviewsList from '@/components/profesional/PublicReviewsList';
import Button from '@/components/ui/Button';
import { useFavoriteProfessionals } from '@/hooks/useFavoriteProfessionals';
import { useClientProfileContext } from '@/context/ClientProfileContext';
import { getPublicProfessionalBySlug } from '@/services/publicBookings';
import { hasKnownAuthSession } from '@/services/session';
import {
  normalizeProfessionalMediaPresentation,
} from '@/utils/professionalMediaPresentation';
import PublicProfileHero, {
  type PublicHeroScheduleItem,
  type PublicHeroSocialLink,
} from '@/components/profesional/public-page/PublicProfileHero';
import PublicServicesSection, {
  type PublicServiceItem,
} from '@/components/profesional/public-page/PublicServicesSection';
import {
  formatServiceDuration,
  formatServicePaymentType,
  formatServicePrice,
  resolveServiceCategoryLabel,
} from '@/components/profesional/public-page/servicePresentation';
import { resolveAssetUrl } from '@/utils/assetUrl';
import type {
  ProfessionalMediaPresentation,
  ProfessionalSchedule,
  PublicService,
  WorkDayKey,
} from '@/types/professional';

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

const normalizeComparableAssetUrl = (value: string | null | undefined): string => {
  const resolved = resolveAssetUrl(value);
  if (!resolved) return '';
  try {
    return new URL(resolved).toString();
  } catch {
    return resolved;
  }
};

const isServiceAssetUrl = (value: string): boolean => {
  if (!value) return false;
  try {
    return new URL(value).pathname.toLowerCase().includes('/services/');
  } catch {
    return value.toLowerCase().includes('/services/');
  }
};

const normalizeServiceId = (value: unknown): string => {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value).trim();
  }
  return '';
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
  const { profile, hasLoaded } = useClientProfileContext();
  const hasClientSession = hasLoaded && Boolean(profile);
  const { isFavorite, toggleFavorite } = useFavoriteProfessionals({
    enabled: canResolveClientFeatures,
    syncWithServer: hasClientSession,
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
  const [favoriteNotice, setFavoriteNotice] = useState<string | null>(null);
  const [selectedServiceIndex, setSelectedServiceIndex] = useState<number | null>(null);
  const [serviceDetailIndex, setServiceDetailIndex] = useState<number | null>(null);
  const [activeServiceCategory, setActiveServiceCategory] = useState('');
  const servicesSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setData((initialData as PublicProfessional | null) ?? null);
    setErrorMessage(null);
  }, [initialData]);

  useEffect(() => {
    if (!favoriteNotice) return undefined;
    const timeoutId = window.setTimeout(() => setFavoriteNotice(null), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [favoriteNotice]);

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
      facebook: '',
      headline: '',
      instagram: '',
      location: '',
      logoMedia: normalizeProfessionalMediaPresentation(null),
      logoUrl: '',
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
      facebook: data.facebook || fallback.facebook,
      headline: data.headline || fallback.headline,
      instagram: data.instagram || fallback.instagram,
      location: data.location || data.address || fallback.location,
      logoMedia: normalizeProfessionalMediaPresentation(data.logoMedia),
      logoUrl: data.logoUrl || fallback.logoUrl,
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
      setSelectedServiceIndex(null);
      setServiceDetailIndex(null);
      return;
    }
    if (selectedServiceIndex !== null && selectedServiceIndex >= displayServices.length) {
      setSelectedServiceIndex(null);
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

  const selectedService =
    selectedServiceIndex !== null ? displayServices[selectedServiceIndex] ?? null : null;
  const serviceDetail =
    serviceDetailIndex !== null ? displayServices[serviceDetailIndex] ?? null : null;
  const aboutValue = merged.about?.trim() || '';

  const displaySchedule = merged.schedule ?? null;

  const scheduleSummary = useMemo(() => {
    const scheduleDays = Array.isArray(displaySchedule?.days) ? displaySchedule.days : [];
    if (!displaySchedule || scheduleDays.length === 0) {
      return [] as PublicHeroScheduleItem[];
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

  const serviceImageUrls = useMemo(() => {
    const urls = displayServices.flatMap((service) => {
      const galleryPhotos = Array.isArray(service.photos) ? service.photos : [];
      return service.imageUrl ? [service.imageUrl, ...galleryPhotos] : galleryPhotos;
    });
    return new Set(urls.map((photo) => normalizeComparableAssetUrl(photo)).filter(Boolean));
  }, [displayServices]);

  const galleryPhotos = useMemo(() => {
    const unique = new Set<string>();
    const publicGalleryPhotos: string[] = [];

    (merged.photos ?? []).forEach((photo) => {
      const normalized = normalizeComparableAssetUrl(photo);
      if (!normalized) return;
      if (serviceImageUrls.has(normalized) || isServiceAssetUrl(normalized)) return;
      if (unique.has(normalized)) return;
      unique.add(normalized);
      publicGalleryPhotos.push(normalized);
    });

    return publicGalleryPhotos.slice(0, 15);
  }, [merged.photos, serviceImageUrls]);

  const hasRealGalleryPhotos = galleryPhotos.some((photo) => Boolean(photo));
  const professionalSlug = typeof slug === 'string' ? slug : '';
  const isCurrentFavorite = isFavorite(professionalSlug);

  const handleReserve = (service: PublicService, date?: string, time?: string) => {
    const params = new URLSearchParams();
    const normalizedServiceId = normalizeServiceId(service.id);
    if (normalizedServiceId) {
      params.set('serviceId', normalizedServiceId);
    } else if (service.name) {
      params.set('servicio', service.name);
    }
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
    if (typeof window === 'undefined') return;

    const section =
      servicesSectionRef.current ?? document.getElementById('servicios');

    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    window.location.hash = '#servicios';
  };

  const handlePrimaryReserveEntry = () => {
    handleViewServices();
  };

  const { addressLine, cityLine } = useMemo(
    () => splitLocationLines(merged.location || ''),
    [merged.location],
  );
  const addressValue = [addressLine, cityLine].filter(Boolean).join(', ');
  const phoneValue = merged.phoneNumber?.trim() || '';
  const instagramValue = merged.instagram?.trim() || '';
  const facebookValue = merged.facebook?.trim() || '';
  const tiktokValue = merged.tiktok?.trim() || '';
  const websiteValue = merged.website?.trim() || '';
  const whatsappValue = merged.whatsapp?.trim() || '';
  const whatsappContactValue = phoneValue || whatsappValue;
  const instagramHref = resolveSocialHref(instagramValue, 'instagram');
  const facebookHref = resolveSocialHref(facebookValue, 'facebook');
  const tiktokHref = resolveSocialHref(tiktokValue, 'tiktok');
  const websiteHref = resolveSocialHref(websiteValue, 'website');
  const whatsappHref = resolveSocialHref(whatsappContactValue, 'whatsapp');
  const socialLinks = useMemo<PublicHeroSocialLink[]>(
    () =>
      [
        instagramHref ? { href: instagramHref, label: 'Instagram', platform: 'instagram' as const } : null,
        facebookHref ? { href: facebookHref, label: 'Facebook', platform: 'facebook' as const } : null,
        tiktokHref ? { href: tiktokHref, label: 'TikTok', platform: 'tiktok' as const } : null,
        websiteHref ? { href: websiteHref, label: 'Sitio web', platform: 'website' as const } : null,
      ].filter((item): item is PublicHeroSocialLink => Boolean(item)),
    [facebookHref, instagramHref, tiktokHref, websiteHref],
  );
  const favoriteImage = galleryPhotos[0] || merged.logoUrl || undefined;

  const hasPublicContent = Boolean(
    merged.name ||
      merged.headline ||
      merged.category ||
      merged.logoUrl ||
      addressValue ||
      phoneValue ||
      scheduleSummary.length > 0 ||
      socialLinks.length > 0 ||
      whatsappHref ||
      (Array.isArray(merged.photos) && merged.photos.some(Boolean)) ||
      displayServices.length > 0,
  );

  const toggleFavoriteHandler = () => {
    if (!professionalSlug) return;

    if (!hasClientSession) {
      setFavoriteNotice('Tenés que iniciar sesión o registrarte para añadir a favoritos.');
      return;
    }

    setFavoriteNotice(null);
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
        className={`mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 ${
          isPreview ? 'pb-6 pt-4 sm:pt-6' : 'pb-32 pt-4 sm:pt-6 lg:pt-8'
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

        {!isPreview && favoriteNotice ? (
          <div
            role="alert"
            className="mb-6 rounded-[24px] border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-900"
          >
            {favoriteNotice}
          </div>
        ) : null}

        {!isPreview && !isLoading && !errorMessage && !hasPublicContent ? (
          <div className="mb-6 rounded-[24px] border border-[#E2E7EC] bg-white/85 px-6 py-4 text-sm text-[#64748B]">
            No hay información pública cargada para este profesional.
          </div>
        ) : null}

        <PublicProfileHero
          address={addressValue}
          bannerMedia={merged.bannerMedia}
          bannerUrl={merged.bannerUrl}
          category={merged.category}
          headline={merged.headline}
          initials={initials}
          isCurrentFavorite={isCurrentFavorite}
          isPreview={isPreview}
          logoMedia={merged.logoMedia}
          logoUrl={merged.logoUrl}
          name={merged.name}
          onToggleFavorite={toggleFavoriteHandler}
          photoUrls={merged.photos}
          rating={data?.rating}
          reviewsCount={data?.reviewsCount}
          scheduleSummary={scheduleSummary}
          socialLinks={socialLinks}
          whatsappHref={whatsappHref}
        />
        <div className="mt-6">
          <section className="border-t border-[color:var(--border-soft)] py-6 sm:py-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[color:var(--ink-faint)]">
                  Galería de fotos
                </p>
                <h2 className="mt-2 text-3xl font-semibold text-[color:var(--ink)]">
                  Espacio, trabajos y detalles
                </h2>
              </div>
              {hasRealGalleryPhotos ? (
                <p className="text-sm font-medium text-[color:var(--ink-faint)]">
                  {galleryPhotos.length} {galleryPhotos.length === 1 ? 'foto publicada' : 'fotos publicadas'}
                </p>
              ) : null}
            </div>

            <div className="mt-5 overflow-hidden rounded-[24px] border border-[color:var(--border-soft)]">
              <BusinessGallery photos={galleryPhotos} businessName={merged.name} />
            </div>
          </section>

          <section
            ref={servicesSectionRef}
            id="servicios"
            className="border-t border-[color:var(--border-soft)] py-6 sm:py-7"
          >
            <PublicServicesSection
              activeCategory={activeServiceCategory}
              categories={serviceCategories}
              onCategoryChange={setActiveServiceCategory}
              onOpenServiceDetail={setServiceDetailIndex}
              onReserveService={handleReserveService}
              serviceItems={serviceItems}
            />
          </section>

          {aboutValue ? (
            <section className="border-t border-[color:var(--border-soft)] py-6 sm:py-7">
              <div className="max-w-4xl">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[color:var(--ink-faint)]">
                  Sobre nosotros
                </p>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[color:var(--ink-muted)] sm:text-base">
                  {aboutValue}
                </p>
              </div>
            </section>
          ) : null}

          {!isPreview && professionalSlug ? (
            <section className="border-t border-[color:var(--border-soft)] py-6 sm:py-7">
              <PublicReviewsList
                slug={professionalSlug}
                name={merged.name}
                category={merged.category}
                address={addressLine || addressValue}
                city={cityLine}
                latitude={data?.latitude ?? data?.lat ?? null}
                longitude={data?.longitude ?? data?.lng ?? null}
                rating={data?.rating}
                reviewsCount={data?.reviewsCount}
              />
            </section>
          ) : null}
        </div>
      </main>

      {!isPreview && !selectedService ? (
        <div
          className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] right-4 z-40 sm:bottom-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] sm:right-5 lg:bottom-6 lg:right-6"
        >
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="rounded-full px-5 shadow-[0_18px_44px_-28px_rgba(15,23,42,0.28)]"
            onClick={handlePrimaryReserveEntry}
          >
            Reservar
          </Button>
        </div>
      ) : null}

      {!isPreview && selectedService ? (
        <div className="fixed inset-x-0 bottom-3 z-40 px-3 lg:hidden">
          <div className="mx-auto flex w-full max-w-[1500px] items-center gap-3 rounded-[22px] border border-[#D9E3EC] bg-white/96 px-4 py-3 shadow-[0_18px_44px_-28px_rgba(15,23,42,0.28)] backdrop-blur">
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
