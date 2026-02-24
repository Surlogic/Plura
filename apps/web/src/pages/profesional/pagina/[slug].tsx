import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import api from '@/services/api';

const defaultServices = [
  { name: 'Corte + styling', price: 'Desde $9.500', duration: '45 min' },
  { name: 'Color completo', price: 'Desde $18.000', duration: '2 hs' },
  { name: 'Tratamiento nutritivo', price: 'Desde $6.200', duration: '30 min' },
  { name: 'Maquillaje social', price: 'Desde $12.000', duration: '1 hs' },
];

const reviews = [
  {
    name: 'Camila R.',
    date: 'Hace 2 días',
    text: 'Atención impecable y súper cálido el equipo. Me encantó el resultado.',
  },
  {
    name: 'Valen M.',
    date: 'Hace 1 semana',
    text: 'Excelente organización y puntualidad. Volvería sin dudar.',
  },
  {
    name: 'Juli P.',
    date: 'Hace 2 semanas',
    text: 'Los detalles hacen la diferencia. Todo muy prolijo y cuidado.',
  },
];

const ratingBreakdown = [68, 18, 9, 3, 2];

type PreviewPayload = {
  name?: string;
  category?: string;
  headline?: string;
  about?: string;
  photos?: string[];
};

type PublicService = {
  id: string;
  name: string;
  price: string;
  duration: string;
};

type PublicProfessional = {
  id: string;
  slug: string;
  fullName: string;
  rubro: string;
  headline?: string | null;
  about?: string | null;
  location?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  photos?: string[];
  services?: PublicService[];
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

  useEffect(() => {
    if (!slug || isPreview) return;
    setIsLoading(true);
    setErrorMessage(null);

    api
      .get(`/public/profesionales/${slug}`)
      .then((response) => {
        setData(response.data);
      })
      .catch(() => {
        setErrorMessage('No encontramos este profesional.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [slug, isPreview]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('preview') !== '1') return;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!event.data || event.data.type !== 'plura-preview') return;
      setPreview(event.data.payload as PreviewPayload);
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const resolved = useMemo(() => {
    const fallback = {
      name: 'Profesional',
      category: 'Rubro',
      rating: '4.9',
      reviews: '420',
      location: 'Buenos Aires',
      headline: 'Color, cuidado y estilo con agenda online.',
      about:
        'Somos un equipo especializado en bienestar y estética con foco en la experiencia. Trabajamos con productos de primera línea y un equipo que acompaña cada detalle para que te sientas cómodo desde la primera visita.',
      email: 'hola@plura.com',
      phoneNumber: '+54 11 5555 4444',
      photos: [],
      services: [] as PublicService[],
    };

    if (!data) {
      return fallback;
    }

    return {
      ...fallback,
      name: data.fullName || fallback.name,
      category: data.rubro || fallback.category,
      headline: data.headline || fallback.headline,
      about: data.about || fallback.about,
      location: data.location || fallback.location,
      email: data.email || fallback.email,
      phoneNumber: data.phoneNumber || fallback.phoneNumber,
      photos: data.photos || fallback.photos,
      services: data.services || fallback.services,
    };
  }, [data]);

  const merged = useMemo(() => {
    if (!preview) return resolved;
    return {
      ...resolved,
      name: preview.name || resolved.name,
      category: preview.category || resolved.category,
      headline: preview.headline || resolved.headline,
      about: preview.about || resolved.about,
      photos:
        preview.photos && preview.photos.length > 0
          ? preview.photos
          : resolved.photos,
    };
  }, [resolved, preview]);

  const displayServices =
    data?.services && data.services.length > 0 ? data.services : defaultServices;

  const initials = merged.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={`min-h-screen text-[#0E2A47] ${
        isPreview ? 'bg-transparent' : 'bg-[#BFC2C5]'
      }`}
    >
      {isPreview ? null : <Navbar />}
      <main
        className={`mx-auto w-full max-w-6xl px-4 ${
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
        <section className="rounded-[34px] border border-white/70 bg-white/95 p-8 shadow-[0_28px_70px_rgba(15,23,42,0.18)]">
          <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-start">
            <div className="flex items-center gap-5 lg:shrink-0">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#1FB6A6] bg-white text-base font-semibold text-[#0E2A47]">
                {initials}
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

            <div className="flex h-24 w-full flex-1 items-center justify-center rounded-[24px] border border-[#E2E7EC] bg-[linear-gradient(90deg,#BFEDE7,#EAF4F3,#D8DEE4)] sm:h-28">
              <span className="text-xs uppercase tracking-[0.6em] text-[#94A3B8]">Banner</span>
            </div>

            <div className="w-full lg:w-56">
              <div className="rounded-[18px] border border-[#E2E7EC] bg-[#F7F9FB] px-4 py-3">
                <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">Rubro</p>
                <p className="text-sm font-semibold text-[#0E2A47]">{merged.category}</p>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
                <div className="rounded-[18px] border border-[#E2E7EC] bg-[#F7F9FB] px-4 py-3">
                  <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">Puntuación</p>
                  <p className="text-sm font-semibold text-[#0E2A47]">
                    {resolved.rating} <span className="text-[#F5B301]">★</span>
                  </p>
                </div>
                <div className="rounded-[18px] border border-[#E2E7EC] bg-[#F7F9FB] px-4 py-3">
                  <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">Reseñas</p>
                  <p className="text-sm font-semibold text-[#0E2A47]">
                    {resolved.reviews} opiniones
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.2fr,1fr]">
          <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
            <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">Galería</p>
            <h2 className="mt-2 text-xl font-semibold">Fotos del negocio o de los trabajos</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(merged.photos && merged.photos.length > 0
                ? merged.photos
                : Array.from({ length: 4 }).map(() => '')
              ).map((src, index) => (
                <div
                  key={`gallery-${index}`}
                  className="h-36 rounded-[18px] bg-[#EEF2F6] bg-cover bg-center"
                  style={{ backgroundImage: src ? `url(${src})` : undefined }}
                />
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
            <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">Resumen</p>
            <h2 className="mt-2 text-xl font-semibold">Servicios destacados</h2>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-[#0E2A47]">
              <span className="rounded-full bg-[#1FB6A6]/10 px-3 py-1">Centro de pelo</span>
              <span className="rounded-full bg-[#0E2A47]/10 px-3 py-1">Precio</span>
              <span className="rounded-full bg-[#1FB6A6]/10 px-3 py-1">Agenda</span>
            </div>
            <div className="mt-4 space-y-3">
              {displayServices.map((service) => (
                <div
                  key={service.name}
                  className="flex items-center justify-between rounded-[18px] border border-[#E2E7EC] bg-[#F7F9FB] px-4 py-3"
                >
                  <div>
                    <p className="font-semibold">{service.name}</p>
                    <p className="text-xs text-[#64748B]">{service.duration}</p>
                  </div>
                  <span className="text-sm font-semibold text-[#1FB6A6]">{service.price}</span>
                </div>
              ))}
            </div>
            <button className="mt-4 w-full rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-sm font-semibold text-[#0E2A47] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              Ver todo
            </button>
          </div>
        </section>

        <section className="mt-10 rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
          <div
            className="grid gap-8"
            style={{ gridTemplateColumns: '1fr 1.4fr' }}
          >
            <div className="border-r border-[#E2E8F0] pr-8">
            <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">Reseñas</p>
            <h2 className="mt-2 text-xl font-semibold">Las marcas de reseñas</h2>
            <div className="mt-4 rounded-[20px] bg-[#F7F9FB] px-6 py-5">
              <p className="text-3xl font-semibold text-[#0E2A47]">{resolved.rating}</p>
              <p className="text-sm text-[#64748B]">Basado en {resolved.reviews} reseñas</p>
              <div className="mt-2 flex gap-1 text-[#1FB6A6]">
                {Array.from({ length: 5 }).map((_, index) => (
                  <span key={index}>★</span>
                ))}
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {ratingBreakdown.map((value, index) => (
                <div key={`rating-${index}`} className="flex items-center gap-3 text-xs text-[#64748B]">
                  <span className="w-4 text-[0.7rem] font-semibold text-[#0E2A47]">{5 - index}</span>
                  <div className="h-2 flex-1 rounded-full bg-[#E2E8F0]">
                    <div className="h-full rounded-full bg-[#1FB6A6]" style={{ width: `${value}%` }} />
                  </div>
                  <span className="w-10 text-right text-[0.7rem] text-[#64748B]">{value}%</span>
                </div>
              ))}
            </div>
            <button className="mt-4 w-full rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#0E2A47] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              Ver en lista
            </button>
            </div>

            <div className="pl-2">
            <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">Opiniones</p>
            <h2 className="mt-2 text-xl font-semibold">Reseñas en sitio</h2>
            <div className="mt-4 space-y-4">
              {reviews.map((review) => (
                <div
                  key={review.name}
                  className="rounded-[18px] border border-[#E2E8F0] bg-white px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center justify-between text-sm">
                    <p className="font-semibold text-[#0E2A47]">{review.name}</p>
                    <span className="text-xs text-[#64748B]">{review.date}</span>
                  </div>
                  <p className="mt-2 text-sm text-[#64748B]">{review.text}</p>
                </div>
              ))}
            </div>
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
          <div
            className="grid gap-8"
            style={{ gridTemplateColumns: '1.1fr 0.9fr' }}
          >
            <div className="pr-6">
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">Sobre</p>
              <h2 className="mt-2 text-xl font-semibold">Sobre el local o profesional</h2>
              <p className="mt-3 text-sm text-[#64748B]">{merged.about}</p>
            </div>
            <div className="border-l border-[#E2E8F0] pl-6">
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">Tipo</p>
              <h2 className="mt-2 text-xl font-semibold">Profesional o profesional en un local</h2>
              <p className="mt-3 text-sm text-[#64748B]">
                Atención en local propio, con disponibilidad extendida y posibilidad de turnos para eventos especiales.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1FB6A6]/10 px-4 py-2 text-xs font-semibold text-[#1FB6A6]">
                Disponible hoy
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[#94A3B8]">Ubicación</p>
          <h2 className="mt-2 text-xl font-semibold">Datos, ubicación y mapa</h2>
          <div
            className="mt-4 grid gap-4"
            style={{ gridTemplateColumns: '1fr 1.6fr' }}
          >
            <div className="rounded-[18px] border border-[#E2E7EC] bg-[#F7F9FB] p-4 text-sm text-[#64748B]">
              <p className="font-semibold text-[#0E2A47]">Dirección</p>
              <p className="mt-1">{merged.location}</p>
              <p className="mt-4 font-semibold text-[#0E2A47]">Contacto</p>
              <p className="mt-1">{merged.email}</p>
              <p className="mt-1">{merged.phoneNumber}</p>
            </div>
            <div className="min-h-[160px] rounded-[18px] border border-[#E2E7EC] bg-[#E7EDF2]">
              <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
                Mapa
              </div>
            </div>
          </div>
        </section>
      </main>
      {isPreview ? null : <Footer />}
    </div>
  );
}
