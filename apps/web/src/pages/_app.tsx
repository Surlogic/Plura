import type { AppProps } from 'next/app';
import { Instrument_Sans } from 'next/font/google';
import { useRouter } from 'next/router';
import '@/pages/globals.css';
import { ProfessionalProfileProvider } from '@/context/ProfessionalProfileContext';
import { ClientProfileProvider } from '@/context/ClientProfileContext';
import { ProfessionalDashboardUnsavedChangesProvider } from '@/context/ProfessionalDashboardUnsavedChangesContext';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { ThemeProvider } from '@/components/theme/ThemeProvider';

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
  const isClientArea = isRouteOrChild(pathname, '/cliente');
  const isClientAuthArea = isRouteOrChild(pathname, '/cliente/auth');

  const shouldAutoLoadClientProfile =
    (isClientArea && !isClientAuthArea) ||
    isRouteOrChild(pathname, '/explorar') ||
    isRouteOrChild(pathname, '/reservar');

  const shouldAutoLoadProfessionalProfile = isRouteOrChild(
    pathname,
    '/profesional/dashboard',
  );

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ProfessionalDashboardUnsavedChangesProvider>
          <ProfessionalProfileProvider autoLoad={shouldAutoLoadProfessionalProfile}>
            <ClientProfileProvider autoLoad={shouldAutoLoadClientProfile}>
              <div
                className={`${instrumentSans.variable} ${instrumentSans.className} font-sans antialiased`}
              >
                <Component {...pageProps} />
              </div>
            </ClientProfileProvider>
          </ProfessionalProfileProvider>
        </ProfessionalDashboardUnsavedChangesProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
