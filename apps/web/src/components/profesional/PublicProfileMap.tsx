'use client';

import { useMemo } from 'react';
import { Marker } from 'react-map-gl/mapbox';
import MapView from '@/components/map/MapView';

type PublicProfileMapProps = {
  name: string;
  category: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  heightClassName?: string;
  interactive?: boolean;
  zoom?: number;
};

export default function PublicProfileMap({
  name,
  category,
  address,
  city,
  latitude,
  longitude,
  heightClassName = 'h-80',
  interactive = false,
  zoom = 14,
}: PublicProfileMapProps) {
  const initialViewState = useMemo(
    () => ({
      latitude,
      longitude,
      zoom,
    }),
    [latitude, longitude, zoom],
  );

  return (
    <>
      <MapView
        containerClassName={`${heightClassName} overflow-hidden rounded-2xl border border-[#E2E7EC]`}
        fallbackClassName={`${heightClassName} rounded-2xl border border-[#E2E7EC] bg-[#F3F6F9]`}
        fallbackMessage="Falta `NEXT_PUBLIC_MAPBOX_TOKEN` para mostrar el mapa."
        allowForceInteractiveRetry
        initialViewState={initialViewState}
        resetKey={`${latitude}|${longitude}|${zoom}|${interactive ? '1' : '0'}`}
        interactive={interactive}
        dragRotate={false}
        dragPan={interactive}
        doubleClickZoom={interactive}
        scrollZoom={interactive}
        boxZoom={interactive}
        touchPitch={false}
        touchZoomRotate={interactive}
        keyboard={interactive}
      >
        <Marker longitude={longitude} latitude={latitude} anchor="bottom">
          <div
            className="h-4 w-4 rounded-full border-2 border-white bg-[#0E2A47] shadow-[0_0_0_4px_rgba(14,42,71,0.18)]"
            title={`${name || 'Profesional'} · ${category || 'Negocio'} · ${address}${city ? `, ${city}` : ''}`}
          />
        </Marker>
      </MapView>
    </>
  );
}
