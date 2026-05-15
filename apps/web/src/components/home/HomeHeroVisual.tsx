import Image from 'next/image';
import { memo, useEffect, useEffectEvent, useMemo, useState } from 'react';
import type { Category } from '@/types/category';
import { slugToLabel } from '@/utils/searchQuery';

type HomeHeroVisualProps = {
  categories: Category[];
};

type HeroVisualTheme = {
  accent: string;
  gradient: [string, string, string];
  label: string;
  matchers: string[];
};

type HeroVisualSlide = {
  accent: string;
  id: string;
  imageUrl: string;
  placeholderImageUrl: string;
  title: string;
};

const VISUAL_ROTATION_MS = 3600;
const VISUAL_TRANSITION_MS = 760;

const DEFAULT_THEME: HeroVisualTheme = {
  accent: '#36c8f4',
  gradient: ['#0f172a', '#17304a', '#36c8f4'],
  label: 'Estética y cuidado personal',
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
    gradient: ['#f7dfd4', '#d7a18a', '#714230'],
    label: 'Cabello',
    matchers: ['cabello', 'peluquer', 'pelo', 'hair'],
  },
  {
    accent: '#f38cb8',
    gradient: ['#fde8f1', '#f5a8cb', '#934a77'],
    label: 'Uñas',
    matchers: ['unas', 'uñas', 'mani', 'pedi', 'nail'],
  },
  {
    accent: '#7b614d',
    gradient: ['#eadfce', '#b89975', '#47352a'],
    label: 'Barbería',
    matchers: ['barber', 'barba', 'hombre'],
  },
  {
    accent: '#5d8f76',
    gradient: ['#e7f3ee', '#9ac5b0', '#315847'],
    label: 'Bienestar',
    matchers: ['bienestar', 'spa', 'masaj', 'relax', 'holistic'],
  },
  {
    accent: '#5f4dcf',
    gradient: ['#efeefe', '#b6a9f1', '#5948ad'],
    label: 'Cejas y pestañas',
    matchers: ['pestanas', 'pestañas', 'cejas', 'brows', 'lashes'],
  },
  {
    accent: '#d76c7c',
    gradient: ['#fdecef', '#ecabb7', '#99424f'],
    label: 'Maquillaje',
    matchers: ['maquill', 'makeup'],
  },
  {
    accent: '#8c72df',
    gradient: ['#f3efff', '#ccbaf9', '#7459b8'],
    label: 'Estética facial',
    matchers: ['facial', 'estetica-facial', 'estética-facial', 'skin'],
  },
  {
    accent: '#5b87b5',
    gradient: ['#edf4fb', '#afcbe7', '#47698c'],
    label: 'Corporal',
    matchers: ['corporal', 'tratamientos-corporales', 'body'],
  },
  {
    accent: '#3f7c6c',
    gradient: ['#edf8f4', '#a7d8c5', '#2f6456'],
    label: 'Depilación',
    matchers: ['depila'],
  },
  {
    accent: '#3b8d9f',
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

const buildPlaceholderImage = (title: string, theme: HeroVisualTheme) => {
  const safeTitle = escapeSvgText(title);
  const safeLabel = escapeSvgText(theme.label);
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
      <circle cx="204" cy="226" r="156" fill="rgba(255,255,255,0.18)" filter="url(#blur)" />
      <circle cx="772" cy="316" r="184" fill="rgba(255,255,255,0.16)" filter="url(#blur)" />
      <circle cx="724" cy="942" r="196" fill="rgba(15,23,42,0.2)" filter="url(#blur)" />
      <rect x="96" y="108" width="768" height="984" rx="68" fill="rgba(255,255,255,0.12)" />
      <rect x="154" y="168" width="652" height="834" rx="52" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.18)" />
      <rect x="228" y="246" width="504" height="444" rx="44" fill="rgba(15,23,42,0.12)" />
      <circle cx="480" cy="426" r="126" fill="rgba(255,255,255,0.16)" />
      <rect x="286" y="562" width="388" height="190" rx="95" fill="rgba(255,255,255,0.15)" />
      <rect x="212" y="844" width="434" height="18" rx="9" fill="rgba(255,255,255,0.34)" />
      <rect x="212" y="886" width="342" height="18" rx="9" fill="rgba(255,255,255,0.22)" />
      <text x="152" y="966" fill="#ffffff" font-family="Arial, sans-serif" font-size="72" font-weight="700">${safeTitle}</text>
      <text x="152" y="1022" fill="rgba(255,255,255,0.82)" font-family="Arial, sans-serif" font-size="32">${safeLabel}</text>
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
        id: category.id,
        imageUrl: category.imageUrl?.trim() || placeholderImageUrl,
        placeholderImageUrl,
        title,
      };
    });
};

export default memo(function HomeHeroVisual({ categories }: HomeHeroVisualProps) {
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
  }, [prefersReducedMotion, slides.length]);

  const activeSlide = slides[activeIndex] ?? slides[0];
  if (!activeSlide) {
    return null;
  }

  const exitingSlide = previousIndex !== null && previousIndex !== activeIndex
    ? slides[previousIndex]
    : null;

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

  return (
    <aside
      className="relative mx-auto w-full max-w-[29rem] xl:mx-0 xl:max-w-[30rem] 2xl:max-w-[31rem]"
      aria-label="Rubros destacados de Plura"
    >
      <div className="pointer-events-none absolute left-1/2 top-5 h-24 w-24 -translate-x-1/2 rounded-full bg-[color:var(--accent)]/16 blur-3xl xl:left-auto xl:right-10 xl:translate-x-0" />
      <div className="relative overflow-hidden rounded-[32px] border border-white/72 bg-white/84 shadow-[0_34px_90px_-58px_rgba(15,23,42,0.42)] backdrop-blur-xl">
        <div className="relative aspect-[4/4.72] min-h-[19rem] sm:min-h-[22rem] lg:min-h-[24rem] xl:min-h-[27rem] 2xl:min-h-[29rem]">
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
                sizes="(max-width: 640px) min(88vw, 464px), (max-width: 1279px) min(76vw, 500px), 496px"
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
              sizes="(max-width: 640px) min(88vw, 464px), (max-width: 1279px) min(76vw, 500px), 496px"
              className="object-cover"
              onError={() => markImageAsFailed(activeSlide.id)}
            />
          </div>

          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.06)_0%,rgba(15,23,42,0.12)_34%,rgba(15,23,42,0.66)_100%)]" />

          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
            <div className="rounded-[22px] border border-white/18 bg-[rgba(15,23,42,0.22)] p-4 text-white shadow-[0_24px_48px_-38px_rgba(15,23,42,0.72)] backdrop-blur-md">
              <div className="flex items-end justify-between gap-3">
                <h2 className="text-[1.35rem] font-semibold leading-[1.02] text-white sm:text-[1.5rem] lg:text-[1.65rem]">
                  {activeSlide.title}
                </h2>
                <span className="shrink-0 text-[0.7rem] font-medium text-white/66">
                  {activeIndex + 1}/{slides.length}
                </span>
              </div>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/18">
                <div
                  className="h-full rounded-full transition-[width] duration-500 ease-out"
                  style={{ backgroundColor: activeSlide.accent, width: progressWidth }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
});