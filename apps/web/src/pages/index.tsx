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
    rating: null,
    imageUrl: null,
  };
};

export const getStaticProps: GetStaticProps<HomePageProps> = async () => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  let homeData: HomeResponse | null = null;

  try {
    const response = await fetch(`${apiBaseUrl}/api/home`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Home API error ${response.status}`);
    }

    homeData = (await response.json()) as HomeResponse;
  } catch (error) {
    console.error('[HOME] Error fetching /api/home:', error instanceof Error ? error.message : error);
  }

  const hasTopProfessionals = (homeData?.topProfessionals?.length || 0) > 0;
  if (!hasTopProfessionals) {
    try {
      const response = await fetch(
        `${apiBaseUrl}/public/profesionales?limit=${FALLBACK_HOME_PROFESSIONALS_LIMIT}`,
        {
          headers: { Accept: 'application/json' },
        },
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
      console.error('[HOME] Error fetching /public/profesionales:', error instanceof Error ? error.message : error);
    }
  }

  return { props: { homeData }, revalidate: 300 };
};

export default function HomePage({
  homeData,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const stats = homeData?.stats ?? emptyStats;
  const categories: Category[] = homeData?.categories ?? [];
  const topProfessionals = homeData?.topProfessionals ?? [];

  return (
    <div className="relative min-h-screen bg-[#F4F6F8] text-[#0E2A47]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(31,182,166,0.15),transparent_60%)]" />
      <div className="relative z-10">
        <Navbar />
        <main className="space-y-20 pb-24">
          <Hero stats={stats} />
          <CategoriesGrid categories={categories} />
          <TopBusinesses professionals={topProfessionals} />
          <ReviewsSection />
          <FAQSection />
        </main>
        <Footer />
      </div>
    </div>
  );
}
