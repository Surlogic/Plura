'use client';

import { useState } from 'react';
import Map, { Marker, NavigationControl, Popup } from 'react-map-gl/mapbox';

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
  const [showPopup, setShowPopup] = useState(true);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-80 items-center justify-center rounded-2xl border border-[#E2E7EC] bg-[#F3F6F9] px-4 text-center text-sm text-[#64748B]">
        Falta `NEXT_PUBLIC_MAPBOX_TOKEN` para mostrar el mapa.
      </div>
    );
  }

  return (
    <div className="h-80 overflow-hidden rounded-2xl border border-[#E2E7EC]">
      <Map
        initialViewState={{
          latitude,
          longitude,
          zoom: 14,
        }}
        mapStyle={MAPBOX_STYLE}
        mapboxAccessToken={MAPBOX_TOKEN}
        dragRotate={false}
        touchZoomRotate={false}
      >
        <NavigationControl position="top-right" showCompass={false} />
        <Marker longitude={longitude} latitude={latitude} anchor="bottom">
          <button
            type="button"
            onClick={() => setShowPopup((prev) => !prev)}
            className="h-4 w-4 rounded-full border-2 border-white bg-[#0E2A47] shadow-[0_0_0_4px_rgba(14,42,71,0.18)]"
            aria-label="Ver datos del negocio"
          />
        </Marker>
        {showPopup ? (
          <Popup
            longitude={longitude}
            latitude={latitude}
            anchor="top"
            closeOnClick={false}
            onClose={() => setShowPopup(false)}
            offset={14}
          >
            <div className="min-w-[220px] space-y-1">
              <p className="text-sm font-semibold text-[#0E2A47]">{name || 'Profesional'}</p>
              <p className="text-xs text-[#64748B]">{category || 'Negocio'}</p>
              <p className="text-xs text-[#64748B]">{address}</p>
              {city ? <p className="text-xs text-[#94A3B8]">{city}</p> : null}
            </div>
          </Popup>
        ) : null}
      </Map>
    </div>
  );
}
