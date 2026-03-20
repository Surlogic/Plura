import { Head, Html, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="es" suppressHydrationWarning>
      <Head>
        <link rel="preconnect" href="https://api.mapbox.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://api.mapbox.com/mapbox-gl-js/v3.19.1/mapbox-gl.css"
          key="mapbox-gl-stylesheet"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
