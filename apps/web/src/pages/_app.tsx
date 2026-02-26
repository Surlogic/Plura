import type { AppProps } from 'next/app';
import { Sora } from 'next/font/google';
import '@/pages/globals.css';
import { ProfessionalProfileProvider } from '@/context/ProfessionalProfileContext';
import { ClientProfileProvider } from '@/context/ClientProfileContext';

const sora = Sora({
  variable: '--font-sora',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ProfessionalProfileProvider>
      <ClientProfileProvider>
        <div
          className={`${sora.variable} ${sora.className} font-sans antialiased`}
        >
          <Component {...pageProps} />
        </div>
      </ClientProfileProvider>
    </ProfessionalProfileProvider>
  );
}
