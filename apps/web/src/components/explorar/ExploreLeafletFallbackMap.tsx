'use client';

import { useCallback, useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import MapStyles from '@/components/map/MapStyles';
import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
} from 'react-leaflet';
import {
  divIcon,
  point,
  type DivIcon,
  type LatLngBoundsExpression,
  type LatLngExpression,
} from 'leaflet';
import ExploreMapPopupCard from '@/components/explorar/ExploreMapPopupCard';
import {
  getExploreMapPopupVerticalFocusOffset,
  LEAFLET_POPUP_CARD_SELECTOR,
  LEAFLET_POPUP_OFFSET_Y_PX,
  measureExploreMapPopupCardHeight,
} from '@/components/explorar/exploreMapPopupPosition';
import type { ExploreMapViewportBounds } from '@/utils/exploreMapViewport';
import type { ResolvedPublicBusinessMedia } from '@/utils/publicBusinessMedia';

type ExploreLeafletMapItem = {
  id: string;
  slug?: string | null;
  name: string;
  secondaryName?: string | null;
  category: string;
  kindLabel: string;
  rating?: number | null;
  reviewsCount?: number | null;
  priceFrom?: number | null;
  latitude: number;
  longitude: number;
  locationText?: string | null;
  media: ResolvedPublicBusinessMedia;
  initials: string;
};

type ExploreLeafletFallbackMapProps = {
  items: ExploreLeafletMapItem[];
  userLocation?: {
    latitude: number;
    longitude: number;
  };
  selectedResultId?: string | null;
  selectionRequestNonce?: number;
  onSelectResult?: (id: string | null) => void;
  onViewportCenterChange?: (center: { latitude: number; longitude: number }) => void;
  onViewportBoundsChange?: (bounds: ExploreMapViewportBounds | null) => void;
};

const DEFAULT_CENTER: LatLngExpression = [-34.9011, -56.1645];
const DEFAULT_ZOOM = 10;

const buildLeafletMarkerIcon = (item: ExploreLeafletMapItem, isActive: boolean): DivIcon => {
  const hasRating = typeof item.rating === 'number' && Number.isFinite(item.rating) && item.rating > 0;
  const ratingMarkup = hasRating
    ? `<span style="
        display:inline-flex;
        align-items:center;
        gap:4px;
        min-height:18px;
        margin-top:-2px;
        padding:2px 6px;
        border-radius:999px;
        border:1px solid ${isActive ? '#D7EEDC' : 'rgba(255,255,255,0.95)'};
        background:${isActive ? '#F1FAF4' : 'rgba(255,255,255,0.96)'};
        color:${isActive ? '#17653F' : '#0E2A47'};
        font-size:10px;
        font-weight:700;
        line-height:1;
        box-shadow:0 12px 22px -16px rgba(14,42,71,0.44);
      ">
        <span style="color:#E59C17;">★</span>${item.rating?.toFixed(1)}
      </span>`
    : '';

  const avatarSize = isActive ? 44 : 38;
  const avatarMarkup = item.media.logo?.src
    ? `<img
        src="${item.media.logo.src}"
        alt=""
        aria-hidden="true"
        style="width:100%;height:100%;object-fit:cover;display:block;"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
      />
      <span style="
        position:absolute;
        inset:0;
        display:none;
        align-items:center;
        justify-content:center;
        font-size:${isActive ? '13px' : '11px'};
        font-weight:700;
        letter-spacing:0.08em;
        color:#0E2A47;
      ">${item.initials}</span>`
    : `<span style="
        position:absolute;
        inset:0;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:${isActive ? '13px' : '11px'};
        font-weight:700;
        letter-spacing:0.08em;
        color:#0E2A47;
      ">${item.initials}</span>`;

  return divIcon({
    className: '',
    iconSize: [72, hasRating ? avatarSize + 20 : avatarSize],
    iconAnchor: [36, hasRating ? avatarSize + 10 : avatarSize],
    popupAnchor: [0, -(hasRating ? avatarSize + 2 : avatarSize - 2)],
    html: `
      <div style="
        display:flex;
        flex-direction:column;
        align-items:center;
        transform:translateY(-4px);
        pointer-events:auto;
      ">
        <span style="
          position:relative;
          display:flex;
          align-items:center;
          justify-content:center;
          width:${avatarSize}px;
          height:${avatarSize}px;
          overflow:hidden;
          border-radius:999px;
          border:1px solid ${isActive ? '#2E9B66' : 'rgba(255,255,255,0.95)'};
          background:linear-gradient(135deg,#F6F1E8 0%,#FFFFFF 100%);
          box-shadow:${isActive ? '0 0 0 4px rgba(46,155,102,0.18), 0 18px 28px -18px rgba(14,42,71,0.5)' : '0 18px 28px -18px rgba(14,42,71,0.5)'};
        ">
          ${avatarMarkup}
        </span>
        ${ratingMarkup}
      </div>
    `,
  });
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
  selectedResultId,
  selectionRequestNonce,
}: {
  items: ExploreLeafletMapItem[];
  selectedResultId?: string | null;
  selectionRequestNonce?: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!selectedResultId) return;
    const activeItem = items.find((item) => item.id === selectedResultId);
    if (!activeItem) return;

    const frameId = window.requestAnimationFrame(() => {
      const container = map.getContainer();
      const targetZoom = Math.max(map.getZoom(), 14);
      const offsetY = getExploreMapPopupVerticalFocusOffset({
        containerHeight: container.clientHeight,
        popupHeight: measureExploreMapPopupCardHeight(container, LEAFLET_POPUP_CARD_SELECTOR),
        popupOffset: LEAFLET_POPUP_OFFSET_Y_PX,
      });
      const targetPoint = map
        .project([activeItem.latitude, activeItem.longitude], targetZoom)
        .subtract(point(0, offsetY));
      const targetCenter = map.unproject(targetPoint, targetZoom);

      map.flyTo(targetCenter, targetZoom, {
        animate: true,
        duration: 0.5,
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [items, map, selectedResultId, selectionRequestNonce]);

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

function ClearSelectionOnMapClick({
  onSelectResult,
}: {
  onSelectResult?: (id: string | null) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const handleMapClick = () => {
      onSelectResult?.(null);
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [map, onSelectResult]);

  return null;
}

function ReportViewportState({
  items,
  onViewportCenterChange,
  onViewportBoundsChange,
}: {
  items: ExploreLeafletMapItem[];
  onViewportCenterChange?: (center: { latitude: number; longitude: number }) => void;
  onViewportBoundsChange?: (bounds: ExploreMapViewportBounds | null) => void;
}) {
  const map = useMap();
  const emitViewportState = useCallback(() => {
    const center = map.getCenter();
    onViewportCenterChange?.({
      latitude: center.lat,
      longitude: center.lng,
    });

    const bounds = map.getBounds();
    if (!bounds) return;
    onViewportBoundsChange?.({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    });
  }, [map, onViewportBoundsChange, onViewportCenterChange]);

  useEffect(() => {
    emitViewportState();
  }, [emitViewportState, items]);

  useEffect(() => {
    map.on('moveend', emitViewportState);

    return () => {
      map.off('moveend', emitViewportState);
    };
  }, [emitViewportState, map]);

  return null;
}

export default function ExploreLeafletFallbackMap({
  items,
  userLocation,
  selectedResultId = null,
  selectionRequestNonce = 0,
  onSelectResult,
  onViewportCenterChange,
  onViewportBoundsChange,
}: ExploreLeafletFallbackMapProps) {
  const selectedResultIdRef = useRef<string | null>(selectedResultId);
  const lastAutoViewportKeyRef = useRef<string | null>(null);
  const userInteractedSinceResultsRef = useRef(false);
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedResultId) || null,
    [items, selectedResultId],
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
    selectedResultIdRef.current = selectedResultId;
  }, [selectedResultId]);

  useEffect(() => {
    userInteractedSinceResultsRef.current = false;
  }, [viewportKey]);

  return (
    <>
      <MapStyles includeMapbox={false} includeLeaflet />
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
          <ClearSelectionOnMapClick onSelectResult={onSelectResult} />
          <ReportViewportState
            items={items}
            onViewportCenterChange={onViewportCenterChange}
            onViewportBoundsChange={onViewportBoundsChange}
          />
          <FitToResults
            items={items}
            userLocation={userLocation}
            viewportKey={viewportKey}
            lastAutoViewportKeyRef={lastAutoViewportKeyRef}
            userInteractedSinceResultsRef={userInteractedSinceResultsRef}
          />
          <FocusActiveResult
            items={items}
            selectedResultId={selectedResultId}
            selectionRequestNonce={selectionRequestNonce}
          />

          {items.map((item) => {
            const isActive = selectedResultId === item.id;
            return (
              <Marker
                key={item.id}
                position={[item.latitude, item.longitude]}
                icon={buildLeafletMarkerIcon(item, isActive)}
                eventHandlers={{
                  click: () => {
                    const nextId = selectedResultIdRef.current === item.id ? null : item.id;
                    onSelectResult?.(nextId);
                  },
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
              key={selectedItem.id}
              position={[selectedItem.latitude, selectedItem.longitude]}
              closeOnClick={false}
              className="explore-map-popup"
              maxWidth={320}
              offset={[0, LEAFLET_POPUP_OFFSET_Y_PX]}
              eventHandlers={{
                remove: () => {
                  if (selectedResultIdRef.current !== selectedItem.id) return;
                  onSelectResult?.(null);
                },
              }}
            >
              <ExploreMapPopupCard item={selectedItem} />
            </Popup>
          ) : null}
        </MapContainer>
      </div>
    </>
  );
}
