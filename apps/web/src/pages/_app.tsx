import type { AppProps } from 'next/app';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { useEffect, useMemo, useState } from 'react';
import { Instrument_Sans } from 'next/font/google';
import Head from 'next/head';
import { useRouter } from 'next/router';
import '@/pages/globals.css';
import LogoutLoadingOverlay from '@/components/auth/LogoutLoadingOverlay';
import { ProfessionalProfileProvider } from '@/context/ProfessionalProfileContext';
import { ClientProfileProvider } from '@/context/ClientProfileContext';
import { ClientNotificationsProvider } from '@/context/ClientNotificationsContext';
import { LogoutTransitionProvider } from '@/context/LogoutTransitionContext';
import { ProfessionalDashboardUnsavedChangesProvider } from '@/context/ProfessionalDashboardUnsavedChangesContext';
import { ProfessionalNotificationsProvider } from '@/context/ProfessionalNotificationsContext';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import {
  getKnownAuthSessionRole,
  getUsableAuthAccessToken,
  type KnownAuthSessionRole,
  subscribeAuthSessionChange,
} from '@/services/session';
import { invalidateCachedGet } from '@/services/cachedGet';
import { clearFavoriteProfessionals } from '@/services/clientFeatures';
import { fetchCurrentSubscription, isCoreSubscriptionEnabled } from '@/lib/billing/billing';
import UnsavedChangesOverlay from '@/components/profesional/dashboard/UnsavedChangesOverlay';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { reportWebError } from '@/services/errorTelemetry';
export function reportWebVitals(metric: {
  id: string;
  name: string;
  value: number;
  rating?: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  navigationType?: string;
}) {
  const endpoint = process.env.NEXT_PUBLIC_WEB_VITALS_ENDPOINT;
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vital] ${metric.name}:`, {
      value: Math.round(metric.value * 100) / 100,
      rating: metric.rating,
      delta: Math.round(metric.delta * 100) / 100,
      id: metric.id,
    });
    return;
  }
  if (!endpoint) return;
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    page: window.location.pathname,
    timestamp: Date.now(),
  });
  if (typeof navigator.sendBeacon === 'function') {
    navigator.sendBeacon(endpoint, body);
  } else {
    fetch(endpoint, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {});
  }
}

const instrumentSans = Instrument_Sans({
  variable: '--font-instrument-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const isRouteOrChild = (path: string, route: string) =>
  path === route || path.startsWith(`${route}/`);

const shouldBootstrapAuthStateOnPublicPath = (path: string) =>
  path === '/' ||
  isRouteOrChild(path, '/explorar') ||
  isRouteOrChild(path, '/profesional/pagina') ||
  path === '/profesional/[slug]' ||
  path === '/reservar';

const isClientProtectedPath = (path: string) =>
  isRouteOrChild(path, '/cliente') && !isRouteOrChild(path, '/cliente/auth');

const isProfessionalProtectedPath = (path: string) =>
  isRouteOrChild(path, '/profesional/dashboard') ||
  isRouteOrChild(path, '/profesional/notificaciones');

const isAuthEntryPath = (path: string) =>
  path === '/login' ||
  path === '/cliente/auth/login' ||
  path === '/profesional/auth/login' ||
  path === '/cliente/auth/register' ||
  path === '/profesional/auth/register';

const invalidateAuthProfileCaches = () => {
  invalidateCachedGet('/auth/me');
  invalidateCachedGet('/auth/me/cliente');
  invalidateCachedGet('/auth/me/profesional');
};

const dashboardPathForRole = async (role: KnownAuthSessionRole) => {
  if (role === 'CLIENT') return '/cliente/inicio';
  if (role === 'WORKER') return '/trabajador/calendario';

  try {
    const subscription = await fetchCurrentSubscription();
    if (!isCoreSubscriptionEnabled(subscription)) {
      return '/profesional/dashboard/billing';
    }
  } catch {
    return '/profesional/dashboard';
  }

  return '/profesional/dashboard';
};

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const pathname = router.pathname || '';
  const [sessionVersion, setSessionVersion] = useState(0);

  const routeFlags = useMemo(() => {
    const isClientArea = isRouteOrChild(pathname, '/cliente');
    const isClientAuthArea = isRouteOrChild(pathname, '/cliente/auth');
    const isProfessionalDashboardArea = isRouteOrChild(pathname, '/profesional/dashboard');
    const isProfessionalNotificationsArea = isRouteOrChild(pathname, '/profesional/notificaciones');
    const hasUsableAccessToken = Boolean(getUsableAuthAccessToken());
    const knownSessionRole = getKnownAuthSessionRole();
    const shouldBootstrapPublicAuth = shouldBootstrapAuthStateOnPublicPath(pathname);

    const shouldAutoLoadClientProfileFromPublicSession =
      shouldBootstrapPublicAuth &&
      hasUsableAccessToken &&
      knownSessionRole === 'CLIENT';

    const shouldAutoLoadProfessionalProfileFromPublicSession =
      shouldBootstrapPublicAuth &&
      hasUsableAccessToken &&
      knownSessionRole === 'PROFESSIONAL';

    return {
      isProfessionalDashboardArea,
      isProfessionalNotificationsArea,
      shouldSkipRefreshOnClientAutoLoad: shouldAutoLoadClientProfileFromPublicSession,
      shouldSkipRefreshOnProfessionalAutoLoad: shouldAutoLoadProfessionalProfileFromPublicSession,
      shouldAutoLoadClientProfile:
        (isClientArea && !isClientAuthArea) ||
        shouldAutoLoadClientProfileFromPublicSession,
      shouldAutoLoadProfessionalProfile:
        isProfessionalDashboardArea ||
        isProfessionalNotificationsArea ||
        shouldAutoLoadProfessionalProfileFromPublicSession,
      shouldMountClientNotifications: isClientArea && !isClientAuthArea,
      shouldMountProfessionalNotifications:
        isProfessionalDashboardArea || isProfessionalNotificationsArea,
    };
  }, [pathname, sessionVersion]);

  const {
    isProfessionalDashboardArea,
    isProfessionalNotificationsArea,
    shouldAutoLoadClientProfile,
    shouldAutoLoadProfessionalProfile,
    shouldSkipRefreshOnClientAutoLoad,
    shouldSkipRefreshOnProfessionalAutoLoad,
    shouldMountClientNotifications,
    shouldMountProfessionalNotifications,
  } = routeFlags;

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = subscribeAuthSessionChange(({ snapshot, isExternal }) => {
      invalidateAuthProfileCaches();
      clearFavoriteProfessionals();
      setSessionVersion((version) => version + 1);

      const currentPath = window.location.pathname;
      const hasSession = Boolean(snapshot.accessToken || snapshot.hasSessionHint);
      const activeRole = snapshot.contextSelectionPending ? null : snapshot.role;
      const hasActiveSession = hasSession && Boolean(activeRole);

      if (isExternal && hasActiveSession && activeRole) {
        void dashboardPathForRole(activeRole).then((targetPath) => {
          if (!isMounted) return;
          const latestPath = window.location.pathname;
          const latestHref = window.location.href;
          const latestIsClientPath = isClientProtectedPath(latestPath);
          const latestIsProfessionalPath = isProfessionalProtectedPath(latestPath);
          const latestIsProtectedPath = latestIsClientPath || latestIsProfessionalPath;
          const latestIsAuthEntryPath = isAuthEntryPath(latestPath);
          const isCompatibleProtectedPath =
            (latestIsClientPath && activeRole === 'CLIENT') ||
            (latestIsProfessionalPath && activeRole === 'PROFESSIONAL');

          if (latestIsAuthEntryPath || (latestIsProtectedPath && !isCompatibleProtectedPath)) {
            void router.replace(targetPath);
            return;
          }

          if (latestIsProtectedPath && isCompatibleProtectedPath) {
            window.location.assign(latestHref);
          }
        });
        return;
      }

      const isClientPath = isClientProtectedPath(currentPath);
      const isProfessionalPath = isProfessionalProtectedPath(currentPath);
      if (!isClientPath && !isProfessionalPath) return;

      const isCompatibleProtectedPath =
        (isClientPath && activeRole === 'CLIENT') ||
        (isProfessionalPath && activeRole === 'PROFESSIONAL');

      if (!hasSession) {
        void router.replace('/login');
        return;
      }

      if (!activeRole) {
        return;
      }

      if (!isCompatibleProtectedPath) {
        void dashboardPathForRole(activeRole).then((targetPath) => {
          if (!isMounted) return;
          const latestPath = window.location.pathname;
          const latestIsClientPath = isClientProtectedPath(latestPath);
          const latestIsProfessionalPath = isProfessionalProtectedPath(latestPath);
          const latestIsProtectedPath = latestIsClientPath || latestIsProfessionalPath;
          const latestIsCompatibleProtectedPath =
            (latestIsClientPath && activeRole === 'CLIENT') ||
            (latestIsProfessionalPath && activeRole === 'PROFESSIONAL');

          if (
            latestIsProtectedPath &&
            (!latestIsCompatibleProtectedPath || latestPath !== targetPath)
          ) {
            void router.replace(targetPath);
          }
        });
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      void reportWebError({
        errorType: event.error instanceof Error ? event.error.name : 'WindowError',
        message: event.message || 'Unhandled window error',
        stackTrace: event.error instanceof Error ? event.error.stack : undefined,
        context: {
          origin: 'window.error',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      void reportWebError({
        errorType: reason instanceof Error ? reason.name : 'UnhandledRejection',
        message: reason instanceof Error ? reason.message : String(reason ?? 'Unhandled promise rejection'),
        stackTrace: reason instanceof Error ? reason.stack : undefined,
        context: { origin: 'window.unhandledrejection' },
      });
    };
    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  let content = (
    <div
      className={`${instrumentSans.variable} ${instrumentSans.className} font-sans antialiased`}
    >
      {/* eslint-disable-next-line no-restricted-syntax -- Next App entrypoint passes page props dynamically */}
      <Component {...pageProps} />
    </div>
  );

  if (shouldMountClientNotifications) {
    content = (
      <ClientNotificationsProvider>
        {content}
      </ClientNotificationsProvider>
    );
  }

  content = (
    <ClientProfileProvider
      autoLoad={shouldAutoLoadClientProfile}
      skipRefreshOnAutoLoad={shouldSkipRefreshOnClientAutoLoad}
      clearStoredSessionOnAutoLoadAuthError={shouldSkipRefreshOnClientAutoLoad}
    >
      {content}
    </ClientProfileProvider>
  );

  content = (
    <ProfessionalProfileProvider
      autoLoad={shouldAutoLoadProfessionalProfile}
      skipRefreshOnAutoLoad={shouldSkipRefreshOnProfessionalAutoLoad}
      clearStoredSessionOnAutoLoadAuthError={shouldSkipRefreshOnProfessionalAutoLoad}
    >
      {content}
    </ProfessionalProfileProvider>
  );

  if (isProfessionalDashboardArea || isProfessionalNotificationsArea) {
    content = (
      <ProfessionalDashboardUnsavedChangesProvider>
        {content}
        <UnsavedChangesOverlay isDashboardRoute={isProfessionalDashboardArea} />
      </ProfessionalDashboardUnsavedChangesProvider>
    );
  }

  if (shouldMountProfessionalNotifications) {
    content = (
      <ProfessionalNotificationsProvider>
        {content}
      </ProfessionalNotificationsProvider>
    );
  }

  return (
    <ThemeProvider>
      <Head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/logo-symbol.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo-symbol.png" />
      </Head>
      <LogoutTransitionProvider>
        <ErrorBoundary>{content}</ErrorBoundary>
        <LogoutLoadingOverlay />
        <SpeedInsights />
      </LogoutTransitionProvider>
    </ThemeProvider>
  );
}
