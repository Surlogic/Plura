import { useEffect, useState } from 'react';
import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import Hero from '@/components/home/Hero';
import CategoriesGrid from '@/components/home/CategoriesGrid';
import TopBusinesses from '@/components/home/TopBusinesses';
import ReviewsSection from '@/components/home/ReviewsSection';
import FAQSection from '@/components/home/FAQSection';
import type { HomeResponse, HomeTopProfessional } from '@/types/home';
import type { Category } from '@/types/category';
import type { PublicProfessionalSummary } from '@/types/professional';

type HomePageProps = {
  homeData: HomeResponse | null;
};

const FALLBACK_HOME_PROFESSIONALS_LIMIT = 8;
const HOME_FETCH_TIMEOUT_MS = 10000;

const emptyStats: HomeResponse['stats'] = {
  activeUsers: 0,
  professionals: 0,
  categories: 0,
  monthlyBookings: 0,
};

const mapPublicToHomeProfessional = (
  professional: PublicProfessionalSummary,
): HomeTopProfessional => {
  const primaryCategory = professional.categories?.[0]?.name?.trim();
  return {
    id: professional.id,
    slug: professional.slug,
    name: professional.fullName?.trim() || 'Profesional',
    category: primaryCategory || professional.rubro?.trim() || 'Profesional',
    rating: professional.rating ?? null,
    reviewsCount: professional.reviewsCount ?? null,
    imageUrl: professional.logoUrl ?? null,
  };
};

const fetchWithTimeout = (url: string, timeoutMs = HOME_FETCH_TIMEOUT_MS) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, {
    headers: { Accept: 'application/json' },
    signal: controller.signal,
  }).finally(() => clearTimeout(id));
};

const hasRenderableHomeData = (homeData: HomeResponse | null) => {
  if (!homeData) return false;
  if ((homeData.categories?.length ?? 0) > 0) return true;
  if ((homeData.topProfessionals?.length ?? 0) > 0) return true;
  return Object.values(homeData.stats ?? emptyStats).some((value) => value > 0);
};

const fetchHomeData = async (
  apiBaseUrl: string,
  options?: { logErrors?: boolean },
): Promise<HomeResponse | null> => {
  let homeData: HomeResponse | null = null;

  try {
    const response = await fetchWithTimeout(`${apiBaseUrl}/api/home`);

    if (!response.ok) {
      throw new Error(`Home API error ${response.status}`);
    }

    homeData = (await response.json()) as HomeResponse;
  } catch (error) {
    if (options?.logErrors) {
      console.error('[HOME] Error fetching /api/home:', error instanceof Error ? error.message : error);
    }
  }

  const hasTopProfessionals = (homeData?.topProfessionals?.length || 0) > 0;
  if (!hasTopProfessionals) {
    try {
      const response = await fetchWithTimeout(
        `${apiBaseUrl}/public/profesionales?limit=${FALLBACK_HOME_PROFESSIONALS_LIMIT}`,
      );

      if (response.ok) {
        const publicProfessionals = (await response.json()) as PublicProfessionalSummary[];
        const fallbackProfessionals = Array.isArray(publicProfessionals)
          ? publicProfessionals.map(mapPublicToHomeProfessional)
          : [];

        if (fallbackProfessionals.length > 0) {
          homeData = {
            stats: homeData?.stats ?? emptyStats,
            categories: homeData?.categories ?? [],
            topProfessionals: fallbackProfessionals,
          };
        }
      }
    } catch (error) {
      if (options?.logErrors) {
        console.error('[HOME] Error fetching /public/profesionales:', error instanceof Error ? error.message : error);
      }
    }
  }

  return homeData;
};

export const getStaticProps: GetStaticProps<HomePageProps> = async () => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const homeData = process.env.SKIP_HOME_SSG_FETCH === 'true'
    ? null
    : await fetchHomeData(apiBaseUrl, { logErrors: true });

  return { props: { homeData }, revalidate: 300 };
};

export default function HomePage({
  homeData,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const [resolvedHomeData, setResolvedHomeData] = useState(homeData);
  const [isLoadingHomeData, setIsLoadingHomeData] = useState(!hasRenderableHomeData(homeData));

  useEffect(() => {
    if (hasRenderableHomeData(homeData)) {
      setResolvedHomeData(homeData);
      setIsLoadingHomeData(false);
      return;
    }

    let cancelled = false;

    const loadHomeData = async () => {
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        const nextHomeData = await fetchHomeData(apiBaseUrl);
        if (!cancelled && nextHomeData) {
          setResolvedHomeData(nextHomeData);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingHomeData(false);
        }
      }
    };

    void loadHomeData();

    return () => {
      cancelled = true;
    };
  }, [homeData]);

  const stats = resolvedHomeData?.stats ?? emptyStats;
  const categories: Category[] = resolvedHomeData?.categories ?? [];
  const topProfessionals = resolvedHomeData?.topProfessionals ?? [];
  const isInitialHomeLoading = isLoadingHomeData && !hasRenderableHomeData(resolvedHomeData);

  return (
    <div className="relative min-h-screen bg-[color:var(--background)] text-[color:var(--ink)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(54,200,244,0.1),transparent_58%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[linear-gradient(180deg,rgba(15,23,42,0.03),transparent)]" />
      <div className="relative z-10">
        <Navbar />
        <main className="space-y-20 pb-24">
          <Hero stats={stats} isLoading={isInitialHomeLoading} />
          <CategoriesGrid categories={categories} isLoading={isInitialHomeLoading} />
          <TopBusinesses professionals={topProfessionals} isLoading={isInitialHomeLoading} />
          <ReviewsSection />
          <FAQSection />
        </main>
        <Footer />
      </div>
    </div>
  );
}
