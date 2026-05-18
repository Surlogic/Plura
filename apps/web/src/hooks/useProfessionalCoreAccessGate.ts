'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  fetchCurrentSubscription,
  isCoreSubscriptionEnabled,
} from '@/lib/billing/billing';

const isBillingDashboardPath = (path: string) =>
  path === '/profesional/dashboard/billing' ||
  path.startsWith('/profesional/dashboard/billing?');

const isProfessionalOperationalPath = (path: string) =>
  (
    path === '/profesional/dashboard' ||
    path.startsWith('/profesional/dashboard/') ||
    path === '/profesional/notificaciones' ||
    path.startsWith('/profesional/notificaciones/')
  ) && !isBillingDashboardPath(path);

export const useProfessionalCoreAccessGate = () => {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;

    const path = router.asPath || router.pathname || '';
    if (!isProfessionalOperationalPath(path)) return;

    let isActive = true;
    void fetchCurrentSubscription()
      .then((subscription) => {
        if (!isActive || isCoreSubscriptionEnabled(subscription)) return;
        void router.replace('/profesional/dashboard/billing?activation=pending');
      })
      .catch(() => {
        if (!isActive) return;
        void router.replace('/profesional/dashboard/billing?activation=pending');
      });

    return () => {
      isActive = false;
    };
  }, [router, router.asPath, router.isReady, router.pathname]);
};
