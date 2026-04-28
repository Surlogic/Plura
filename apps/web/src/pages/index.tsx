import { useEffect, useState } from 'react';
import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import Hero from '@/components/home/Hero';
import CategoriesGrid from '@/components/home/CategoriesGrid';
import TopBusinesses from '@/components/home/TopBusinesses';
import HowItWorksSection from '@/components/home/HowItWorksSection';
import ReviewsSection from '@/components/home/ReviewsSection';
import FinalCtaSection from '@/components/home/FinalCtaSection';
import type { HomeResponse } from '@/types/home';
import type { Category } from '@/types/category';

type HomePageProps = {
  homeData: HomeResponse | null;
};

const HOME_FETCH_TIMEOUT_MS = 10000;
const HOME_REVALIDATE_SECONDS = 300;

const emptyStats: HomeResponse['stats'] = {
  activeUsers: 0,
  professionals: 0,
  categories: 0,
  monthlyBookings: 0,
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
  try {
    const response = await fetchWithTimeout(`${apiBaseUrl}/api/home`);

    if (!response.ok) {
      throw new Error(`Home API error ${response.status}`);
    }

    return (await response.json()) as HomeResponse;
  } catch (error) {
    if (options?.logErrors) {
      console.error('[HOME] Error fetching /api/home:', error instanceof Error ? error.message : error);
    }
    return null;
  }
};

export const getStaticProps: GetStaticProps<HomePageProps> = async () => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const homeData = await fetchHomeData(apiBaseUrl, { logErrors: true });

  return {
    props: {
      homeData,
    },
    revalidate: HOME_REVALIDATE_SECONDS,
  };
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
        <main className="space-y-14 pb-24 sm:space-y-18">
          <Hero categories={categories} stats={stats} isLoading={isInitialHomeLoading} />
          <CategoriesGrid categories={categories} isLoading={isInitialHomeLoading} />
          <TopBusinesses professionals={topProfessionals} isLoading={isInitialHomeLoading} />
          <HowItWorksSection />
          <ReviewsSection />
          <FinalCtaSection />
        </main>
        <Footer />
      </div>
    </div>
  );
}
