import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import Hero from '@/components/home/Hero';
import CategoriesGrid from '@/components/home/CategoriesGrid';
import TopBusinesses from '@/components/home/TopBusinesses';
import ReviewsSection from '@/components/home/ReviewsSection';
import FAQSection from '@/components/home/FAQSection';

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-[#F4F6F8] text-[#0E2A47]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(31,182,166,0.15),transparent_60%)]" />
      <div className="relative z-10">
        <Navbar />
        <main className="space-y-20 pb-24">
          <Hero />
          <CategoriesGrid />
          <TopBusinesses />
          <ReviewsSection />
          <FAQSection />
        </main>
        <Footer />
      </div>
    </div>
  );
}
