import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import Hero from '@/components/home/Hero';
import CategoriesGrid from '@/components/home/CategoriesGrid';
import TopBusinesses from '@/components/home/TopBusinesses';
import ReviewsSection from '@/components/home/ReviewsSection';
import FAQSection from '@/components/home/FAQSection';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F4F6F8] text-[#0E2A47]">
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
  );
}
