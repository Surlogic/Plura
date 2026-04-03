import Image from 'next/image';
import { memo, useEffect, useEffectEvent, useMemo, useState } from 'react';
import type { Category } from '@/types/category';
import { slugToLabel } from '@/utils/searchQuery';

type HomeHeroVisualProps = {
  categories: Category[];
  isLoading?: boolean;
};

type HeroVisualTheme = {
  accent: string;
  badge: string;
  description: string;
  gradient: [string, string, string];
  label: string;
  matchers: string[];
};

type HeroVisualSlide = {
  accent: string;
  badge: string;
  description: string;
  id: string;
  imageUrl: string;
  label: string;
  placeholderImageUrl: string;
  title: string;
};

const VISUAL_ROTATION_MS = 3600;
const VISUAL_TRANSITION_MS = 760;
const PREVIEW_CARD_COUNT = 3;

const DEFAULT_THEME: HeroVisualTheme = {
  accent: '#36c8f4',
  badge: 'Marketplace',
  description: 'Profesionales y espacios listos para reservar en Plura.',
  gradient: ['#0f172a', '#17304a', '#36c8f4'],
  label: 'Belleza y bienestar',
  matchers: [],
};

const FALLBACK_CATEGORY_SEED: Category[] = [
  { id: 'fallback-cabello', name: 'Pelo', slug: 'cabello' },
  { id: 'fallback-unas', name: 'Uñas', slug: 'unas' },
  { id: 'fallback-barberia', name: 'Barbería', slug: 'barberia' },
  { id: 'fallback-bienestar', name: 'Masajes y bienestar', slug: 'bienestar-holistico' },
  { id: 'fallback-pestanas-cejas', name: 'Cejas y pestañas', slug: 'pestanas-cejas' },
  { id: 'fallback-maquillaje', name: 'Maquillaje', slug: 'maquillaje' },
];

const HERO_VISUAL_THEMES: HeroVisualTheme[] = [
  {
    accent: '#c97354',
    badge: 'Cabina',
    description: 'Color, brushing y cortes con una estética editorial contenida.',
    gradient: ['#f7dfd4', '#d7a18a', '#714230'],
    label: 'Cabello',
    matchers: ['cabello', 'peluquer', 'pelo', 'hair'],
  },
  {
    accent: '#f38cb8',
    badge: 'Studio',
    description: 'Manicuría, nail art y detalles de acabado en primer plano.',
    gradient: ['#fde8f1', '#f5a8cb', '#934a77'],
    label: 'Uñas',
    matchers: ['unas', 'uñas', 'mani', 'pedi', 'nail'],
  },
  {
    accent: '#7b614d',
    badge: 'Barber',
    description: 'Cortes y perfilado con una presencia sobria y precisa.',
    gradient: ['#eadfce', '#b89975', '#47352a'],
    label: 'Barbería',
    matchers: ['barber', 'barba', 'hombre'],
  },
  {
    accent: '#5d8f76',
    badge: 'Wellness',
    description: 'Masajes y bienestar con foco en calma, espacio y respiración.',
    gradient: ['#e7f3ee', '#9ac5b0', '#315847'],
    label: 'Bienestar',
    matchers: ['bienestar', 'spa', 'masaj', 'relax', 'holistic'],
  },
  {
    accent: '#5f4dcf',
    badge: 'Precision',
    description: 'Diseño de cejas, lifting y pestañas con un look prolijo.',
    gradient: ['#efeefe', '#b6a9f1', '#5948ad'],
    label: 'Cejas y pestañas',
    matchers: ['pestanas', 'pestañas', 'cejas', 'brows', 'lashes'],
  },
  {
    accent: '#d76c7c',
    badge: 'Makeup',
    description: 'Maquillaje social y editorial con acabados de alto detalle.',
    gradient: ['#fdecef', '#ecabb7', '#99424f'],
    label: 'Maquillaje',
    matchers: ['maquill', 'makeup'],
  },
  {
    accent: '#8c72df',
    badge: 'Skin',
    description: 'Rutinas faciales y tratamientos visibles sin cargar la escena.',
    gradient: ['#f3efff', '#ccbaf9', '#7459b8'],
    label: 'Estética facial',
    matchers: ['facial', 'estetica-facial', 'estética-facial', 'skin'],
  },
  {
    accent: '#5b87b5',
    badge: 'Body Care',
    description: 'Tratamientos corporales con composición limpia y calma visual.',
    gradient: ['#edf4fb', '#afcbe7', '#47698c'],
    label: 'Corporal',
    matchers: ['corporal', 'tratamientos-corporales', 'body'],
  },
  {
    accent: '#3f7c6c',
    badge: 'Glow',
    description: 'Depilación y cuidado estético con señal visual serena.',
    gradient: ['#edf8f4', '#a7d8c5', '#2f6456'],
    label: 'Depilación',
    matchers: ['depila'],
  },
  {
    accent: '#3b8d9f',
    badge: 'Skin Tech',
    description: 'Sesiones especializadas con tono clínico-premium, sin frialdad.',
    gradient: ['#edf7fa', '#9fd3df', '#2c6673'],
    label: 'Medicina estética',
    matchers: ['medicina-estetica', 'medicina estética', 'esthetic'],
  },
];

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const escapeSvgText = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const svgToDataUri = (svg: string) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

const resolveTheme = (category: Pick<Category, 'name' | 'slug'>): HeroVisualTheme => {
  const searchable = `${normalizeText(category.slug)} ${normalizeText(category.name)}`;
  return HERO_VISUAL_THEMES.find((theme) =>
    theme.matchers.some((matcher) => searchable.includes(normalizeText(matcher))),
  ) ?? DEFAULT_THEME;
};

const buildPlaceholderImage = (
  title: string,
  theme: HeroVisualTheme,
) => {
  const safeTitle = escapeSvgText(title);
  const safeLabel = escapeSvgText(theme.label);
  const safeBadge = escapeSvgText(theme.badge);
  const [start, middle, end] = theme.gradient;

  return svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 1200" role="img" aria-label="${safeTitle}">
      <defs>
        <linearGradient id="bg" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="${start}" />
          <stop offset="55%" stop-color="${middle}" />
          <stop offset="100%" stop-color="${end}" />
        </linearGradient>
        <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="48" />
        </filter>
      </defs>
      <rect width="960" height="1200" rx="84" fill="url(#bg)" />
      <circle cx="212" cy="224" r="152" fill="rgba(255,255,255,0.18)" filter="url(#blur)" />
      <circle cx="782" cy="314" r="184" fill="rgba(255,255,255,0.14)" filter="url(#blur)" />
      <circle cx="730" cy="910" r="204" fill="rgba(15,23,42,0.2)" filter="url(#blur)" />
      <rect x="88" y="98" width="784" height="1004" rx="64" fill="rgba(255,255,255,0.14)" />
      <rect x="132" y="154" width="696" height="892" rx="52" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.18)" />
      <rect x="196" y="250" width="568" height="458" rx="44" fill="rgba(15,23,42,0.12)" />
      <circle cx="480" cy="446" r="132" fill="rgba(255,255,255,0.18)" />
      <rect x="300" y="570" width="360" height="184" rx="92" fill="rgba(255,255,255,0.16)" />
      <rect x="220" y="814" width="520" height="18" rx="9" fill="rgba(255,255,255,0.38)" />
      <rect x="220" y="852" width="406" height="18" rx="9" fill="rgba(255,255,255,0.25)" />
      <rect x="220" y="896" width="328" height="18" rx="9" fill="rgba(255,255,255,0.2)" />
      <text x="156" y="206" fill="rgba(255,255,255,0.86)" font-family="Arial, sans-serif" font-size="28" font-weight="700" letter-spacing="8">${safeBadge}</text>
      <text x="156" y="972" fill="#ffffff" font-family="Arial, sans-serif" font-size="68" font-weight="700">${safeTitle}</text>
      <text x="156" y="1024" fill="rgba(255,255,255,0.82)" font-family="Arial, sans-serif" font-size="32">${safeLabel}</text>
    </svg>
  `);
};

const buildSlides = (categories: Category[]): HeroVisualSlide[] => {
  const source = categories.length > 0 ? categories : FALLBACK_CATEGORY_SEED;

  return [...source]
    .filter((category) => (category.name || category.slug).trim().length > 0)
    .sort((left, right) => {
      const leftOrder = left.displayOrder ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.displayOrder ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return left.name.localeCompare(right.name, 'es');
    })
    .map((category) => {
      const theme = resolveTheme(category);
      const title = category.name?.trim() || slugToLabel(category.slug);
      const placeholderImageUrl = buildPlaceholderImage(title, theme);

      return {
        accent: theme.accent,
        badge: theme.badge,
        description: theme.description,
        id: category.id,
        imageUrl: category.imageUrl?.trim() || placeholderImageUrl,
        label: theme.label,
        placeholderImageUrl,
        title,
      };
    });
};

const getWrappedSlide = (slides: HeroVisualSlide[], index: number) =>
  slides[((index % slides.length) + slides.length) % slides.length];

export default memo(function HomeHeroVisual({
  categories,
  isLoading = false,
}: HomeHeroVisualProps) {
  const slides = useMemo(() => buildSlides(categories), [categories]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    setActiveIndex(0);
    setPreviousIndex(null);
    setFailedImages({});
  }, [slides]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updateMotionPreference();
    mediaQuery.addEventListener('change', updateMotionPreference);

    return () => mediaQuery.removeEventListener('change', updateMotionPreference);
  }, []);

  useEffect(() => {
    if (previousIndex === null || prefersReducedMotion) return undefined;

    const timeoutId = window.setTimeout(() => {
      setPreviousIndex(null);
    }, VISUAL_TRANSITION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [prefersReducedMotion, previousIndex]);

  const rotateSlide = useEffectEvent(() => {
    if (prefersReducedMotion || slides.length <= 1 || document.hidden) return;

    setActiveIndex((currentIndex) => {
      const nextIndex = (currentIndex + 1) % slides.length;
      setPreviousIndex(currentIndex);
      return nextIndex;
    });
  });

  useEffect(() => {
    if (prefersReducedMotion || slides.length <= 1) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      rotateSlide();
    }, VISUAL_ROTATION_MS);

    return () => window.clearInterval(intervalId);
  }, [prefersReducedMotion, rotateSlide, slides.length]);

  const activeSlide = slides[activeIndex] ?? slides[0];
  if (!activeSlide) {
    return null;
  }

  const exitingSlide = previousIndex !== null && previousIndex !== activeIndex
    ? slides[previousIndex]
    : null;
  const previewSlides = useMemo(
    () =>
      Array.from({ length: Math.min(Math.max(slides.length - 1, 0), PREVIEW_CARD_COUNT) }, (_, offset) =>
        getWrappedSlide(slides, activeIndex + offset + 1),
      ),
    [activeIndex, slides],
  );

  const resolveImageSrc = (slide: HeroVisualSlide) =>
    failedImages[slide.id] ? slide.placeholderImageUrl : slide.imageUrl;

  const markImageAsFailed = (slideId: string) => {
    setFailedImages((current) => {
      if (current[slideId]) {
        return current;
      }
      return { ...current, [slideId]: true };
    });
  };

  const progressWidth = slides.length > 0 ? `${((activeIndex + 1) / slides.length) * 100}%` : '0%';
  const activeAccent = activeSlide?.accent ?? DEFAULT_THEME.accent;

  return (
    <aside className="mx-auto w-full max-w-[25rem] lg:mx-0 lg:justify-self-end" aria-label="Rubros destacados de Plura">
      <div className="relative overflow-hidden rounded-[30px] border border-white/70 bg-white/82 p-3 shadow-[0_32px_84px_-56px_rgba(15,23,42,0.38)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-6 top-0 h-24 rounded-full bg-[color:var(--accent)]/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-8 bottom-5 h-28 w-28 rounded-full bg-[color:var(--primary)]/10 blur-3xl" />

        <div className="relative overflow-hidden rounded-[24px] bg-[color:var(--surface-soft)]">
          <div className="relative aspect-[4/4.65] min-h-[17rem]">
            {exitingSlide ? (
              <div
                className="absolute inset-0"
                style={{
                  animation: prefersReducedMotion
                    ? 'none'
                    : `home-hero-visual-exit ${VISUAL_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1) both`,
                }}
              >
                <Image
                  src={resolveImageSrc(exitingSlide)}
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 400px"
                  className="object-cover"
                  onError={() => markImageAsFailed(exitingSlide.id)}
                />
              </div>
            ) : null}

            <div
              className="absolute inset-0"
              style={{
                animation: prefersReducedMotion
                  ? 'none'
                  : `home-hero-visual-enter ${VISUAL_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1) both`,
              }}
            >
              <Image
                key={activeSlide.id}
                src={resolveImageSrc(activeSlide)}
                alt={`Rubro ${activeSlide.title}`}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 400px"
                className="object-cover"
                onError={() => markImageAsFailed(activeSlide.id)}
              />
            </div>

            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.08)_0%,rgba(15,23,42,0.16)_38%,rgba(15,23,42,0.62)_100%)]" />

            <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4 sm:p-5">
              <span className="rounded-full border border-white/22 bg-white/14 px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-white/88 backdrop-blur-sm">
                {activeSlide.badge}
              </span>
              <span className="rounded-full border border-white/18 bg-[rgba(15,23,42,0.2)] px-3 py-1 text-[0.62rem] font-medium text-white/72 backdrop-blur-sm">
                {prefersReducedMotion ? 'Vista fija' : 'Rotación suave'}
              </span>
            </div>

            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
              <div className="rounded-[22px] border border-white/18 bg-[rgba(15,23,42,0.22)] p-4 text-white shadow-[0_28px_56px_-42px_rgba(15,23,42,0.72)] backdrop-blur-md">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-white/70">
                  {activeSlide.label}
                </p>
                <h2 className="mt-2 text-[1.55rem] font-semibold leading-[1.02] text-white">
                  {activeSlide.title}
                </h2>
                <p className="mt-2 max-w-[18rem] text-sm leading-5 text-white/74">
                  {activeSlide.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        {previewSlides.length > 0 ? (
          <div className="relative mt-3 grid grid-cols-3 gap-2.5">
            {previewSlides.map((slide, index) => (
              <div
                key={`${slide.id}-${index}`}
                className="relative overflow-hidden rounded-[18px] border border-[color:var(--border-soft)]/85 bg-[color:var(--surface-soft)] shadow-[0_20px_40px_-36px_rgba(15,23,42,0.3)]"
              >
                <div className="relative aspect-[1/1.08]">
                  <Image
                    src={resolveImageSrc(slide)}
                    alt=""
                    fill
                    sizes="110px"
                    className="object-cover"
                    onError={() => markImageAsFailed(slide.id)}
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.08),rgba(15,23,42,0.58))]" />
                  <div className="absolute inset-x-0 bottom-0 p-2">
                    <p className="line-clamp-2 text-[0.68rem] font-semibold leading-4 text-white">
                      {slide.title}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between gap-3 px-1">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[color:var(--border-soft)]/90">
            <div
              className="h-full rounded-full transition-[width] duration-500 ease-out"
              style={{ backgroundColor: activeAccent, width: progressWidth }}
            />
          </div>
          <p className="text-[0.68rem] font-medium text-[color:var(--ink-muted)]">
            {isLoading && categories.length === 0
              ? 'Preparando rubros...'
              : `${activeIndex + 1} de ${slides.length} rubros`}
          </p>
        </div>
      </div>
    </aside>
  );
});
