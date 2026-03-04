'use client';

import Map, { Marker } from 'react-map-gl/mapbox';

type PublicProfileMapProps = {
  name: string;
  category: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
};

const MAPBOX_TOKEN = (process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '').trim();
const MAPBOX_STYLE = 'mapbox://styles/mapbox/light-v11';

export default function PublicProfileMap({
  name,
  category,
  address,
  city,
  latitude,
  longitude,
}: PublicProfileMapProps) {
  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-80 items-center justify-center rounded-2xl border border-[#E2E7EC] bg-[#F3F6F9] px-4 text-center text-sm text-[#64748B]">
        Falta `NEXT_PUBLIC_MAPBOX_TOKEN` para mostrar el mapa.
      </div>
    );
  }

  return (
    <div className="h-80 overflow-hidden rounded-2xl">
      <Map
        initialViewState={{
          latitude,
          longitude,
          zoom: 14,
        }}
        mapStyle={MAPBOX_STYLE}
        mapboxAccessToken={MAPBOX_TOKEN}
        interactive={false}
        dragRotate={false}
        dragPan={false}
        doubleClickZoom={false}
        scrollZoom={false}
        boxZoom={false}
        touchPitch={false}
        touchZoomRotate={false}
        keyboard={false}
      >
        <Marker longitude={longitude} latitude={latitude} anchor="bottom">
          <div
            className="h-4 w-4 rounded-full border-2 border-white bg-[#0E2A47] shadow-[0_0_0_4px_rgba(14,42,71,0.18)]"
            title={`${name || 'Profesional'} · ${category || 'Negocio'} · ${address}${city ? `, ${city}` : ''}`}
          />
        </Marker>
      </Map>
    </div>
  );
}
