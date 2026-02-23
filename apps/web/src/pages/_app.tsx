import type { AppProps } from 'next/app';
import { Comfortaa, Fraunces, Manrope } from 'next/font/google';
import '@/pages/globals.css';

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
});

const comfortaa = Comfortaa({
  variable: '--font-comfortaa',
  subsets: ['latin'],
  weight: ['600'],
  display: 'swap',
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`${manrope.variable} ${fraunces.variable} ${comfortaa.variable} ${manrope.className} font-sans antialiased`}>
      <Component {...pageProps} />
    </div>
  );
}
