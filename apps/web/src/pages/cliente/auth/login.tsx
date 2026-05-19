import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AuthTopBar from '@/components/auth/AuthTopBar';
import Footer from '@/components/shared/Footer';

export default function ClienteLoginRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;

    void router.replace({
      pathname: '/login',
      query: {
        ...router.query,
        intent: 'client',
      },
    });
  }, [router]);

  return (
    <div className="app-shell min-h-screen bg-[color:var(--background)] text-[color:var(--ink)]">
      <AuthTopBar tone="client" />
      <main className="mx-auto flex min-h-[55vh] w-full max-w-md items-center justify-center px-4 text-center">
        <p className="text-sm font-semibold text-[color:var(--ink-muted)]">
          Redirigiendo al acceso...
        </p>
      </main>
      <Footer />
    </div>
  );
}
