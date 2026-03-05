import Head from 'next/head';

const MAPBOX_STYLESHEET_URL = 'https://api.mapbox.com/mapbox-gl-js/v3.19.1/mapbox-gl.css';

export default function MapboxStyles() {
  return (
    <Head>
      <link rel="preconnect" href="https://api.mapbox.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href={MAPBOX_STYLESHEET_URL}
        key="mapbox-gl-stylesheet"
      />
    </Head>
  );
}
