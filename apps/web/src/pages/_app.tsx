import type { AppProps } from 'next/app';
import { useMemo } from 'react';
import { Instrument_Sans } from 'next/font/google';
import { useRouter } from 'next/router';
import '@/pages/globals.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import LogoutLoadingOverlay from '@/components/auth/LogoutLoadingOverlay';
import { ProfessionalProfileProvider } from '@/context/ProfessionalProfileContext';
import { ClientProfileProvider } from '@/context/ClientProfileContext';
import { ClientNotificationsProvider } from '@/context/ClientNotificationsContext';
import { LogoutTransitionProvider } from '@/context/LogoutTransitionContext';
import { ProfessionalDashboardUnsavedChangesProvider } from '@/context/ProfessionalDashboardUnsavedChangesContext';
import { ProfessionalNotificationsProvider } from '@/context/ProfessionalNotificationsContext';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import UnsavedChangesOverlay from '@/components/profesional/dashboard/UnsavedChangesOverlay';
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

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const pathname = router.pathname || '';

  const routeFlags = useMemo(() => {
    const isClientArea = isRouteOrChild(pathname, '/cliente');
    const isClientAuthArea = isRouteOrChild(pathname, '/cliente/auth');
    const isProfessionalDashboardArea = isRouteOrChild(pathname, '/profesional/dashboard');
    const isProfessionalNotificationsArea = isRouteOrChild(pathname, '/profesional/notificaciones');

    return {
      isProfessionalDashboardArea,
      isProfessionalNotificationsArea,
      shouldAutoLoadClientProfile: isClientArea && !isClientAuthArea,
      shouldAutoLoadProfessionalProfile:
        isProfessionalDashboardArea ||
        isProfessionalNotificationsArea,
      shouldMountClientNotifications: isClientArea && !isClientAuthArea,
      shouldMountProfessionalNotifications:
        isProfessionalDashboardArea || isProfessionalNotificationsArea,
    };
  }, [pathname]);

  const {
    isProfessionalDashboardArea,
    isProfessionalNotificationsArea,
    shouldAutoLoadClientProfile,
    shouldAutoLoadProfessionalProfile,
    shouldMountClientNotifications,
    shouldMountProfessionalNotifications,
  } = routeFlags;

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
    <ClientProfileProvider autoLoad={shouldAutoLoadClientProfile}>
      {content}
    </ClientProfileProvider>
  );

  content = (
    <ProfessionalProfileProvider autoLoad={shouldAutoLoadProfessionalProfile}>
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
      <LogoutTransitionProvider>
        {content}
        <LogoutLoadingOverlay />
      </LogoutTransitionProvider>
    </ThemeProvider>
  );
}
