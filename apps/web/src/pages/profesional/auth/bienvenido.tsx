'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

import AuthTopBar from '@/components/auth/AuthTopBar';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useProfessionalProfileContext } from '@/context/ProfessionalProfileContext';
import { ensureAuthContext } from '@/lib/auth/contexts';

export default function ProfesionalBienvenidoPage() {
  const router = useRouter();
  const { refreshProfile } = useProfessionalProfileContext();
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    let isActive = true;

    const validateProfessionalSession = async () => {
      try {
        await ensureAuthContext('PROFESSIONAL');
        await refreshProfile();

        if (isActive) {
          setIsCheckingSession(false);
        }
      } catch {
        if (isActive) {
          void router.replace('/login?intent=professional');
        }
      }
    };

    void validateProfessionalSession();

    return () => {
      isActive = false;
    };
  }, [refreshProfile, router]);

  return (
    <main className="min-h-screen bg-[color:var(--surface-soft)] text-[color:var(--foreground)]">
      <AuthTopBar tone="professional" />

      <section className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-3xl items-center px-4 py-12 sm:px-6">
        <Card tone="glass" padding="lg" className="w-full text-center">
          {isCheckingSession ? (
            <div className="space-y-3" aria-live="polite">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--primary)]">
                Plura Core
              </p>
              <h1 className="text-3xl font-semibold text-[color:var(--foreground)]">
                Preparando tu bienvenida...
              </h1>
            </div>
          ) : (
            <div className="space-y-7">
              <div className="space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--primary)]">
                  Plura Core activo
                </p>
                <div className="space-y-3">
                  <h1 className="text-4xl font-semibold text-[color:var(--foreground)]">
                    ¡Bienvenido a Plura!
                  </h1>
                  <p className="text-xl font-medium text-[color:var(--foreground)]">
                    Tu cuenta profesional ya está activa.
                  </p>
                </div>
                <p className="mx-auto max-w-2xl text-base leading-7 text-[color:var(--muted)]">
                  Plura Core quedó habilitado y tu zona de trabajo está lista para empezar a configurar y gestionar tu
                  operación.
                </p>
              </div>

              <Button href="/profesional/dashboard" variant="brand" size="lg">
                Entrar a mi zona de trabajo
              </Button>
            </div>
          )}
        </Card>
      </section>
    </main>
  );
}
