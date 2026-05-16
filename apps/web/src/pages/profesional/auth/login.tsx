import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AuthLoadingOverlay from '@/components/auth/AuthLoadingOverlay';
import AuthTopBar from '@/components/auth/AuthTopBar';
import Footer from '@/components/shared/Footer';

export default function ProfesionalLoginRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;

    void router.replace({
      pathname: '/login',
      query: {
        ...router.query,
        intent: 'professional',
      },
    });
  }, [router]);

  return (
    <div className="app-shell min-h-screen bg-[color:var(--background)] text-[color:var(--ink)]">
      <AuthTopBar tone="professional" />
      <AuthLoadingOverlay
        visible
        title="Redirigiendo al acceso"
        description="El inicio de sesión ahora se realiza desde una única pantalla."
      />
      <Footer />
    </div>
  );
}
