import Head from 'next/head';

type MapStylesProps = {
  includeMapbox?: boolean;
  includeLeaflet?: boolean;
};

export default function MapStyles({
  includeMapbox = true,
  includeLeaflet = false,
}: MapStylesProps) {
  return (
    <Head>
      {includeMapbox ? (
        <link
          rel="stylesheet"
          href="https://api.mapbox.com/mapbox-gl-js/v3.19.1/mapbox-gl.css"
          key="mapbox-gl-stylesheet"
        />
      ) : null}
      {includeLeaflet ? (
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          key="leaflet-stylesheet"
        />
      ) : null}
    </Head>
  );
}
