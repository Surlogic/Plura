'use client';

import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import Link from 'next/link';
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
} from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet';

type ExploreLeafletMapItem = {
  id: string;
  slug: string;
  name: string;
  category: string;
  rating?: number | null;
  reviewsCount?: number | null;
  priceFrom?: number | null;
  latitude: number;
  longitude: number;
  locationText?: string | null;
};

type ExploreLeafletFallbackMapProps = {
  items: ExploreLeafletMapItem[];
  userLocation?: {
    latitude: number;
    longitude: number;
  };
  activeResultId?: string | null;
  onActiveResultChange?: (id: string | null) => void;
};

const DEFAULT_CENTER: LatLngExpression = [-34.9011, -56.1645];
const DEFAULT_ZOOM = 10;

const formatPriceFrom = (value?: number | null) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 'Ver perfil';
  return `Desde $${new Intl.NumberFormat('es-UY').format(Math.round(value))}`;
};

function FitToResults({
  items,
  userLocation,
  viewportKey,
  lastAutoViewportKeyRef,
  userInteractedSinceResultsRef,
}: {
  items: ExploreLeafletMapItem[];
  userLocation?: {
    latitude: number;
    longitude: number;
  };
  viewportKey: string;
  lastAutoViewportKeyRef: MutableRefObject<string | null>;
  userInteractedSinceResultsRef: MutableRefObject<boolean>;
}) {
  const map = useMap();

  useEffect(() => {
    if (lastAutoViewportKeyRef.current === viewportKey) return;
    if (userInteractedSinceResultsRef.current) return;

    lastAutoViewportKeyRef.current = viewportKey;

    if (items.length === 1) {
      map.flyTo([items[0].latitude, items[0].longitude], 13, {
        animate: true,
        duration: 0.6,
      });
      return;
    }

    if (items.length === 0 && userLocation) {
      map.setView([userLocation.latitude, userLocation.longitude], 11, { animate: true });
      return;
    }

    if (items.length === 0) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: false });
      return;
    }

    const boundsPoints: LatLngBoundsExpression = [
      ...items.map((item) => [item.latitude, item.longitude] as [number, number]),
      ...(userLocation ? [[userLocation.latitude, userLocation.longitude] as [number, number]] : []),
    ];

    map.fitBounds(boundsPoints, {
      padding: [56, 56],
      maxZoom: 14,
      animate: true,
    });
  }, [items, lastAutoViewportKeyRef, map, userInteractedSinceResultsRef, userLocation, viewportKey]);

  return null;
}

function FocusActiveResult({
  items,
  activeResultId,
}: {
  items: ExploreLeafletMapItem[];
  activeResultId?: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!activeResultId) return;
    const activeItem = items.find((item) => item.id === activeResultId);
    if (!activeItem) return;

    map.flyTo([activeItem.latitude, activeItem.longitude], Math.max(map.getZoom(), 13), {
      animate: true,
      duration: 0.45,
    });
  }, [activeResultId, items, map]);

  return null;
}

function TrackManualMapInteraction({
  userInteractedSinceResultsRef,
}: {
  userInteractedSinceResultsRef: MutableRefObject<boolean>;
}) {
  const map = useMap();

  useEffect(() => {
    const markInteraction = () => {
      userInteractedSinceResultsRef.current = true;
    };
    const interactionEvents = ['mousedown', 'touchstart', 'dragstart', 'dblclick', 'wheel'] as const;

    interactionEvents.forEach((eventName) => {
      map.on(eventName, markInteraction);
    });

    return () => {
      interactionEvents.forEach((eventName) => {
        map.off(eventName, markInteraction);
      });
    };
  }, [map, userInteractedSinceResultsRef]);

  return null;
}

export default function ExploreLeafletFallbackMap({
  items,
  userLocation,
  activeResultId = null,
  onActiveResultChange,
}: ExploreLeafletFallbackMapProps) {
  const lastAutoViewportKeyRef = useRef<string | null>(null);
  const userInteractedSinceResultsRef = useRef(false);
  const selectedItem = useMemo(
    () => items.find((item) => item.id === activeResultId) || null,
    [activeResultId, items],
  );
  const viewportKey = useMemo(
    () => {
      const itemKey = [...items]
        .map((item) => `${item.id}:${item.latitude.toFixed(5)},${item.longitude.toFixed(5)}`)
        .sort()
        .join('|');
      const userKey = userLocation
        ? `${userLocation.latitude.toFixed(5)},${userLocation.longitude.toFixed(5)}`
        : 'no-user-location';

      return `${itemKey}__${userKey}`;
    },
    [items, userLocation],
  );

  useEffect(() => {
    userInteractedSinceResultsRef.current = false;
  }, [viewportKey]);

  return (
    <div className="relative h-full w-full border border-[#DCE5ED] bg-[#E9EEF2]">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full"
        zoomControl={false}
        scrollWheelZoom
        dragging
        doubleClickZoom
        touchZoom
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
        />
        <ZoomControl position="topright" />
        <TrackManualMapInteraction userInteractedSinceResultsRef={userInteractedSinceResultsRef} />
        <FitToResults
          items={items}
          userLocation={userLocation}
          viewportKey={viewportKey}
          lastAutoViewportKeyRef={lastAutoViewportKeyRef}
          userInteractedSinceResultsRef={userInteractedSinceResultsRef}
        />
        <FocusActiveResult items={items} activeResultId={activeResultId} />

        {items.map((item) => {
          const isActive = activeResultId === item.id;
          return (
            <CircleMarker
              key={item.id}
              center={[item.latitude, item.longitude]}
              radius={isActive ? 11 : 9}
              pathOptions={{
                color: '#FFFFFF',
                weight: 2,
                fillColor: isActive ? '#F59E0B' : '#0E2A47',
                fillOpacity: 0.92,
              }}
              eventHandlers={{
                click: () => onActiveResultChange?.(item.id),
              }}
            />
          );
        })}

        {userLocation ? (
          <CircleMarker
            center={[userLocation.latitude, userLocation.longitude]}
            radius={7}
            pathOptions={{
              color: '#FFFFFF',
              weight: 2,
              fillColor: '#16A34A',
              fillOpacity: 0.95,
            }}
          />
        ) : null}

        {selectedItem ? (
          <Popup
            position={[selectedItem.latitude, selectedItem.longitude]}
            closeOnClick={false}
            eventHandlers={{
              remove: () => onActiveResultChange?.(null),
            }}
          >
            <div className="min-w-[220px] space-y-1.5">
              <p className="text-sm font-semibold text-[#0E2A47]">{selectedItem.name}</p>
              <p className="text-xs text-[#64748B]">{selectedItem.category || 'Profesional'}</p>
              {selectedItem.locationText ? (
                <p className="text-xs text-[#94A3B8]">{selectedItem.locationText}</p>
              ) : null}
              <div className="flex items-center justify-between text-xs text-[#334155]">
                <span>
                  {typeof selectedItem.rating === 'number'
                    ? `★ ${selectedItem.rating.toFixed(1)}${selectedItem.reviewsCount ? ` (${selectedItem.reviewsCount})` : ''}`
                    : 'Sin reseñas'}
                </span>
                <span className="text-[#000000]">{formatPriceFrom(selectedItem.priceFrom)}</span>
              </div>
              <Link
                href={`/profesional/pagina/${encodeURIComponent(selectedItem.slug)}`}
                className="inline-flex h-8 items-center justify-center rounded-full bg-[#0E2A47] px-3 text-xs font-semibold text-white transition hover:brightness-110"
              >
                Ver perfil
              </Link>
            </div>
          </Popup>
        ) : null}
      </MapContainer>
    </div>
  );
}
