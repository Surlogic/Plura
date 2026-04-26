import { getThemeInitScript } from '@/lib/theme';
import { Head, Html, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="es" suppressHydrationWarning>
      <Head>
        <script dangerouslySetInnerHTML={{ __html: getThemeInitScript() }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
