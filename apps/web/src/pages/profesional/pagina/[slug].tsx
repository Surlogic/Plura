import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import api from '@/services/api';
import { mapboxForwardGeocode } from '@/services/mapbox';
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
  try {
    const url = new URL(src, window.location.origin);
    if (url.protocol === 'https:' || url.protocol === 'http:') return src;
    return undefined;
  } catch {
    if (src.startsWith('/') || src.startsWith('./')) return src;
    return undefined;
  }
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

type PublicProfessional = {
  id: string;
  slug: string;
  fullName: string;
  rubro: string;
  logoUrl?: string | null;
  headline?: string | null;
  about?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  email?: string | null;
  phoneNumber?: string | null;
  photos?: string[];
  services?: PublicService[];
  schedule?: ProfessionalSchedule;
};

export default function ProfesionalDetailPage() {
  const router = useRouter();
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
  const [showContact, setShowContact] = useState(false);
  const [fallbackCoordinates, setFallbackCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

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
      name: data.fullName || fallback.name,
      category: data.rubro || fallback.category,
      logoUrl: data.logoUrl || fallback.logoUrl,
      headline: data.headline || fallback.headline,
      about: data.about || fallback.about,
      location: data.location || fallback.location,
      email: data.email || fallback.email,
      phoneNumber: data.phoneNumber || fallback.phoneNumber,
      latitude: parseOptionalNumber(data.latitude),
      longitude: parseOptionalNumber(data.longitude),
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
        .flatMap((service) => service.photos ?? [])
        .filter(Boolean),
    [displayServices],
  );

  const galleryPhotos = useMemo(() => {
    const localPhotos = merged.photos ?? [];
    const combined = [...localPhotos, ...serviceGalleryPhotos];
    if (combined.length > 0) return combined;
    return Array.from({ length: 4 }).map(() => '');
  }, [merged.photos, serviceGalleryPhotos]);

  const professionalSlug = typeof slug === 'string' ? slug : '';

  const handleReserve = (service: PublicService) => {
    const params = new URLSearchParams();
    if (service.id) params.set('serviceId', service.id);
    if (service.name) params.set('servicio', service.name);
    if (professionalSlug) params.set('profesional', professionalSlug);
    const query = params.toString();
    router.push(query ? `/reservar?${query}` : '/reservar');
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

  return (
    <div
      className={`min-h-screen text-[#0E2A47] ${
        isPreview ? 'bg-transparent' : 'bg-[#BFC2C5]'
      }`}
    >
      {isPreview ? null : <Navbar />}
      <main
        className={`mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10 ${
          isPreview ? 'pb-6 pt-6' : 'pb-24 pt-10'
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
        <section className="overflow-hidden rounded-[34px] border border-white/70 bg-white/95 shadow-[0_28px_70px_rgba(15,23,42,0.18)]">
          <div className="h-32 bg-[linear-gradient(120deg,#0B1D2A,#145E63,#BFEDE7)] sm:h-40 lg:h-52" />
          <div className="relative -mt-10 px-6 pb-8 sm:-mt-12 lg:-mt-14">
            <div className="flex flex-col gap-6 rounded-[28px] border border-white/80 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.14)] lg:flex-row lg:items-end lg:justify-between">
              <div className="flex items-center gap-5">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-[#1FB6A6] bg-white text-base font-semibold text-[#0E2A47]">
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
                  <p className="text-[0.7rem] uppercase tracking-[0.4em] text-[#94A3B8]">
                    Profesional / Empresa
                  </p>
                  <h1 className="text-3xl font-semibold text-[#0E2A47] sm:text-4xl">
                    {merged.name}
                  </h1>
                  <p className="text-sm text-[#64748B] sm:text-base">{merged.headline}</p>
                </div>
              </div>

              {merged.category ? (
                <div className="w-full lg:w-64">
                  <div className="rounded-[18px] border border-[#E2E7EC] bg-[#F7F9FB] px-4 py-3">
                    <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">
                      Rubro
                    </p>
                    <p className="text-sm font-semibold text-[#0E2A47]">
                      {merged.category}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1.6fr,1fr]">
          <div className="rounded-[30px] border border-white/70 bg-white/95 p-8 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
            <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">Galería</p>
            <h2 className="mt-2 text-xl font-semibold">Fotos del local y de los servicios</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {galleryPhotos.map((src, index) => (
                <div
                  key={`gallery-${index}`}
                  className="h-40 rounded-[20px] bg-[#EEF2F6] bg-cover bg-center"
                  style={{ backgroundImage: src ? `url("${sanitizeImageSrc(src) ?? ''}")` : undefined }}
                />
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-white/70 bg-white/95 p-8 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
            <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">Resumen</p>
            <h2 className="mt-2 text-xl font-semibold">Servicios destacados</h2>
            <div className="mt-4 space-y-3">
              {displayServices.length === 0 ? (
                <div className="rounded-[18px] border border-dashed border-[#CBD5F5] bg-white/70 px-4 py-4 text-sm text-[#64748B]">
                  No hay servicios cargados todavía.
                </div>
              ) : (
                displayServices.map((service, index) => (
                  <div
                    key={service.id ?? service.name ?? `service-${index}`}
                    className="flex flex-col gap-4 rounded-[18px] border border-[#E2E7EC] bg-[#F7F9FB] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-base font-semibold">{service.name}</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#64748B]">
                        <span className="rounded-full bg-white px-3 py-1">
                          {formatServiceDuration(service.duration)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <span className="text-base font-semibold text-[#1FB6A6]">
                        {formatServicePrice(service.price)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleReserve(service)}
                        className="rounded-full bg-[#0B1D2A] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        Reservar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {displayServices.length > 0 ? (
              <button className="mt-4 w-full rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-sm font-semibold text-[#0E2A47] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                Ver todo
              </button>
            ) : null}
          </div>
        </section>

        {scheduleSummary.length > 0 ? (
          <section className="mt-10 rounded-[30px] border border-white/70 bg-white/95 p-8 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
            <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">Horarios</p>
            <h2 className="mt-2 text-xl font-semibold">Horarios de atención</h2>
            <div className="mt-4 space-y-3">
              {scheduleSummary.map((item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[#E2E7EC] bg-[#F7F9FB] px-4 py-3 text-sm text-[#0E2A47]"
                >
                  <span className="font-semibold">{item.label}</span>
                  <span className="text-sm font-semibold text-[#1FB6A6]">
                    {item.ranges}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-10 rounded-[30px] border border-white/70 bg-white/95 p-8 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">Sobre</p>
          <h2 className="mt-2 text-xl font-semibold">Sobre el local o profesional</h2>
          {merged.about ? (
            <p className="mt-3 text-sm text-[#64748B]">{merged.about}</p>
          ) : (
            <p className="mt-3 text-sm text-[#64748B]">Sin descripción cargada.</p>
          )}
        </section>

        <section className="mt-10 rounded-[30px] border border-white/70 bg-white/95 p-8 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">Ubicación</p>
          <h2 className="mt-2 text-xl font-semibold">Datos, ubicación y mapa</h2>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1fr,1.6fr]">
            <div className="rounded-[18px] border border-[#E2E7EC] bg-[#F7F9FB] p-4 text-sm text-[#64748B]">
              <p className="font-semibold text-[#0E2A47]">Dirección</p>
              {addressLine ? (
                <>
                  <p className="mt-1">{addressLine}</p>
                  {cityLine ? <p>{cityLine}</p> : null}
                </>
              ) : (
                <p className="mt-1">Ubicación no disponible</p>
              )}
              <p className="mt-4 font-semibold text-[#0E2A47]">Contacto</p>
              {(merged.email || merged.phoneNumber) ? (
                showContact ? (
                  <div className="mt-1 space-y-1">
                    {merged.email ? <p>{merged.email}</p> : null}
                    {merged.phoneNumber ? <p>{merged.phoneNumber}</p> : null}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowContact(true)}
                    className="mt-2 rounded-full border border-[#1FB6A6] px-3 py-1 text-xs font-semibold text-[#1FB6A6] transition hover:bg-[#1FB6A6]/10"
                  >
                    Ver datos de contacto
                  </button>
                )
              ) : (
                <p className="mt-1">-</p>
              )}
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
              <div className="flex h-80 items-center justify-center rounded-2xl border border-[#E2E7EC] bg-[#E7EDF2] px-4 text-center text-sm text-[#64748B]">
                Ubicación no disponible
              </div>
            )}
          </div>
        </section>
      </main>
      {isPreview ? null : <Footer />}
    </div>
  );
}
