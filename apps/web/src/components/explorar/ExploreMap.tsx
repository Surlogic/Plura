import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import type { SearchItem } from '@/types/search';
import {
  Marker,
  NavigationControl,
  Popup,
  type MapRef,
} from 'react-map-gl/mapbox';
import mapboxgl from 'mapbox-gl';
import MapView from '@/components/map/MapView';
import ExploreLeafletFallbackMap from '@/components/explorar/ExploreLeafletFallbackMap';
import ExploreMapPopupCard from '@/components/explorar/ExploreMapPopupCard';
import type { ExploreMapViewportBounds } from '@/utils/exploreMapViewport';
import {
  buildPublicBusinessLogoStyle,
  getPublicBusinessInitials,
  resolvePublicBusinessMedia,
  type ResolvedPublicBusinessMedia,
} from '@/utils/publicBusinessMedia';
import {
  getSearchResultKindLabel,
  getSearchResultPrimaryName,
  getSearchResultSecondaryName,
} from '@/utils/searchResultPresentation';

type ExploreMapItem = {
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

type ExploreMapProps = {
  results: SearchItem[];
  userLocation?: {
    latitude: number;
    longitude: number;
  };
  preferUserLocationViewport?: boolean;
  selectedResultId?: string | null;
  selectionRequestNonce?: number;
  fitToResultsRequestNonce?: number;
  onSelectResult?: (id: string | null) => void;
  onViewportCenterChange?: (center: { latitude: number; longitude: number }) => void;
  onViewportBoundsChange?: (bounds: ExploreMapViewportBounds | null) => void;
};

const DEFAULT_CENTER = {
  latitude: -34.9011,
  longitude: -56.1645,
};
const NOISE_LAYER_MATCHERS = [
  /poi/i,
  /transit/i,
  /road-label/i,
  /road-number-shield/i,
  /settlement-subdivision-label/i,
  /settlement-minor-label/i,
  /natural-point-label/i,
  /airport-label/i,
];

const humanizeSlug = (slug: string) =>
  slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const parseOptionalNumber = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

function ExploreMapMarkerAvatar({
  item,
  isActive,
  showRating = true,
}: {
  item: ExploreMapItem;
  isActive: boolean;
  showRating?: boolean;
}) {
  const [hasLogoError, setHasLogoError] = useState(false);
  const hasRating = typeof item.rating === 'number' && Number.isFinite(item.rating) && item.rating > 0;
  const showLogo = Boolean(item.media.logo?.src) && !hasLogoError;

  useEffect(() => {
    setHasLogoError(false);
  }, [item.media.logo?.src]);

  return (
    <div className="flex flex-col items-center">
      <span
        className={`relative flex items-center justify-center overflow-hidden rounded-full border bg-[linear-gradient(135deg,#F6F1E8_0%,#FFFFFF_100%)] text-[#0E2A47] shadow-[0_18px_28px_-18px_rgba(14,42,71,0.5)] transition-transform duration-150 group-hover:-translate-y-0.5 ${
          isActive
            ? 'h-11 w-11 border-[#2E9B66] ring-4 ring-[#2E9B66]/18 sm:h-[2.8rem] sm:w-[2.8rem]'
            : 'h-9 w-9 border-white/95 sm:h-10 sm:w-10'
        }`}
      >
        {showLogo ? (
          // eslint-disable-next-line @next/next/no-img-element -- marker de mapa liviano sin wrappers extra
          <img
            src={item.media.logo?.src || ''}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
            style={buildPublicBusinessLogoStyle(item.media.logo)}
            onError={() => setHasLogoError(true)}
          />
        ) : null}
        <span
          className={`absolute inset-0 flex items-center justify-center font-semibold tracking-[0.08em] ${
            isActive ? 'text-[0.82rem]' : 'text-[0.72rem]'
          } ${showLogo ? 'hidden' : ''}`}
        >
          {item.initials}
        </span>
      </span>
      {showRating && hasRating ? (
        <span
          className={`mt-[-0.1rem] hidden min-h-[1.15rem] items-center rounded-full border px-1.5 py-0.5 text-[0.62rem] font-semibold shadow-[0_12px_22px_-16px_rgba(14,42,71,0.44)] sm:inline-flex ${
            isActive
              ? 'border-[#D7EEDC] bg-[#F1FAF4] text-[#17653F]'
              : 'border-white/95 bg-white/96 text-[#0E2A47]'
          }`}
        >
          <span className="mr-1 text-[0.68rem] text-[#E59C17]">★</span>
          {item.rating?.toFixed(1)}
        </span>
      ) : null}
    </div>
  );
}

function ExploreMap({
  results,
  userLocation,
  preferUserLocationViewport = false,
  selectedResultId = null,
  selectionRequestNonce = 0,
  fitToResultsRequestNonce = 0,
  onSelectResult,
  onViewportCenterChange,
  onViewportBoundsChange,
}: ExploreMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const lastSelectionFocusRef = useRef<string | null>(null);
  const lastAutoViewportKeyRef = useRef<string | null>(null);
  const userInteractedSinceResultsRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);

  const items = useMemo<ExploreMapItem[]>(
    () => {
      const mapped: ExploreMapItem[] = [];
      results.forEach((item) => {
        const latitude = parseOptionalNumber(item.latitude);
        const longitude = parseOptionalNumber(item.longitude);
        if (latitude === null || longitude === null) return;
        const primaryName = getSearchResultPrimaryName(item);
        const secondaryName = getSearchResultSecondaryName(item);
        const kindLabel = getSearchResultKindLabel(item);
        const media = resolvePublicBusinessMedia({
          bannerMedia: item.bannerMedia,
          bannerUrl: item.bannerUrl,
          logoMedia: item.logoMedia,
          logoUrl: item.logoUrl,
          fallbackPhotoUrl: item.fallbackPhotoUrl,
          imageUrl: item.coverImageUrl,
          name: primaryName,
        });

        mapped.push({
          id: String(item.id),
          slug: item.slug || null,
          name: primaryName,
          secondaryName,
          category:
            Array.isArray(item.categorySlugs) && item.categorySlugs.length > 0
              ? humanizeSlug(item.categorySlugs[0])
              : 'Profesional',
          kindLabel,
          rating: parseOptionalNumber(item.rating),
          reviewsCount: typeof item.reviewsCount === 'number' ? item.reviewsCount : null,
          priceFrom: parseOptionalNumber(item.priceFrom),
          latitude,
          longitude,
          locationText: item.locationText || null,
          media,
          initials: media.initials || getPublicBusinessInitials(primaryName),
        });
      });
      return mapped;
    },
    [results],
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

  const selectedItem = useMemo(
    () => {
      if (!selectedResultId) return null;
      return items.find((item) => item.id === selectedResultId) || null;
    },
    [items, selectedResultId],
  );

  useEffect(() => {
    if (selectedResultId && !items.some((item) => item.id === selectedResultId)) {
      onSelectResult?.(null);
    }
  }, [items, onSelectResult, selectedResultId]);

  useEffect(() => {
    userInteractedSinceResultsRef.current = false;
  }, [viewportKey]);

  const markUserInteraction = useCallback(() => {
    userInteractedSinceResultsRef.current = true;
  }, []);
  const emitViewportState = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const center = map.getCenter();
    if (!center) return;

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
  }, [onViewportBoundsChange, onViewportCenterChange]);

  const fitMapToItems = useCallback((nextItems: ExploreMapItem[]) => {
    if (!mapRef.current || nextItems.length === 0) return;

    if (nextItems.length === 1) {
      mapRef.current.flyTo({
        center: [nextItems[0].longitude, nextItems[0].latitude],
        zoom: 13,
        duration: 650,
      });
      return;
    }

    const bounds = new mapboxgl.LngLatBounds();
    nextItems.forEach((item) => bounds.extend([item.longitude, item.latitude]));

    mapRef.current.fitBounds(bounds, {
      padding: 64,
      duration: 650,
      maxZoom: 14,
    });
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return undefined;

    const map = mapRef.current.getMap();
    const interactionEvents = ['mousedown', 'touchstart', 'dragstart', 'wheel', 'dblclick'] as const;
    interactionEvents.forEach((eventName) => {
      map.on(eventName, markUserInteraction);
    });

    return () => {
      interactionEvents.forEach((eventName) => {
        map.off(eventName, markUserInteraction);
      });
    };
  }, [mapReady, markUserInteraction]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || (!onViewportCenterChange && !onViewportBoundsChange)) {
      return undefined;
    }

    const map = mapRef.current.getMap();
    const handleMoveEnd = () => {
      emitViewportState();
    };

    emitViewportState();
    map.on('moveend', handleMoveEnd);

    return () => {
      map.off('moveend', handleMoveEnd);
    };
  }, [emitViewportState, mapReady, onViewportBoundsChange, onViewportCenterChange]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || items.length === 0) return;
    if (lastAutoViewportKeyRef.current === viewportKey) return;
    if (userInteractedSinceResultsRef.current) return;

    lastAutoViewportKeyRef.current = viewportKey;

    if (preferUserLocationViewport && userLocation) {
      mapRef.current.flyTo({
        center: [userLocation.longitude, userLocation.latitude],
        zoom: Math.max(mapRef.current.getZoom(), 11.5),
        duration: 650,
      });
      return;
    }

    if (items.length === 1) {
      mapRef.current.flyTo({
        center: [items[0].longitude, items[0].latitude],
        zoom: 13,
        duration: 650,
      });
      return;
    }

    fitMapToItems(items);
  }, [fitMapToItems, items, mapReady, preferUserLocationViewport, userLocation, viewportKey]);

  useEffect(() => {
    if (!mapReady || fitToResultsRequestNonce <= 0) return;
    fitMapToItems(items);
  }, [fitMapToItems, fitToResultsRequestNonce, items, mapReady]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !selectedResultId) return;
    const nextFocusKey = `${selectedResultId}:${selectionRequestNonce}`;
    if (lastSelectionFocusRef.current === nextFocusKey) return;
    const nextItem = items.find((item) => item.id === selectedResultId);
    if (!nextItem) return;

    lastSelectionFocusRef.current = nextFocusKey;
    const currentZoom = mapRef.current.getZoom();
    mapRef.current.easeTo({
      center: [nextItem.longitude, nextItem.latitude],
      zoom: Math.max(currentZoom, 14.5),
      duration: 460,
      offset: [0, 0],
    });
  }, [items, mapReady, selectedResultId, selectionRequestNonce]);

  useEffect(() => {
    if (!selectedResultId) {
      lastSelectionFocusRef.current = null;
    }
  }, [selectedResultId]);

  const hideVisualNoiseLayers = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const style = map.getStyle();
    if (!style?.layers) return;

    style.layers.forEach((layer) => {
      if (!NOISE_LAYER_MATCHERS.some((matcher) => matcher.test(layer.id))) return;
      try {
        map.setLayoutProperty(layer.id, 'visibility', 'none');
      } catch {
        // Ignore layers that are not mutable in this style.
      }
    });
  }, []);

  const handleMapLoad = useCallback(() => {
    setMapReady(true);
    hideVisualNoiseLayers();
    emitViewportState();
  }, [emitViewportState, hideVisualNoiseLayers]);

  const handleMapClick = useCallback(() => {
    onSelectResult?.(null);
  }, [onSelectResult]);

  const handlePopupClose = useCallback(() => {
    onSelectResult?.(null);
  }, [onSelectResult]);

  const handleMarkerSelect = useCallback((id: string) => {
    onSelectResult?.(id);
  }, [onSelectResult]);

  const initialViewState = useMemo(
    () => ({
      latitude: userLocation?.latitude ?? DEFAULT_CENTER.latitude,
      longitude: userLocation?.longitude ?? DEFAULT_CENTER.longitude,
      zoom: userLocation ? 11 : 10,
    }),
    [userLocation],
  );

  const mapResetKey = viewportKey;

  const interactiveFallbackMap = useMemo(
    () => (
      <ExploreLeafletFallbackMap
        items={items}
        userLocation={userLocation}
        selectedResultId={selectedResultId}
        selectionRequestNonce={selectionRequestNonce}
        onSelectResult={onSelectResult}
        onViewportCenterChange={onViewportCenterChange}
        onViewportBoundsChange={onViewportBoundsChange}
      />
    ),
    [
      items,
      onSelectResult,
      onViewportBoundsChange,
      onViewportCenterChange,
      selectedResultId,
      selectionRequestNonce,
      userLocation,
    ],
  );

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1">
      <Head>
        <link
          rel="stylesheet"
          href="https://api.mapbox.com/mapbox-gl-js/v3.19.1/mapbox-gl.css"
          key="mapbox-gl-stylesheet"
        />
      </Head>
      <MapView
        mapRef={mapRef}
        initialViewState={initialViewState}
        onLoad={handleMapLoad}
        onClick={handleMapClick}
        interactive
        dragPan
        scrollZoom
        doubleClickZoom
        dragRotate={false}
        touchZoomRotate
        containerClassName="pointer-events-auto h-full w-full overflow-hidden border border-[#DCE5ED]"
        fallbackClassName="h-full bg-[#E9EEF2]"
        webglFallbackNode={interactiveFallbackMap}
        resetKey={mapResetKey}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {items.map((item) => {
          const isActive = selectedResultId === item.id;

          return (
            <Marker
              key={item.id}
              longitude={item.longitude}
              latitude={item.latitude}
              anchor="bottom"
            >
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleMarkerSelect(item.id);
                }}
                className="group flex -translate-y-1 flex-col items-center focus:outline-none"
                aria-label={`Ver ${item.name}`}
              >
                <ExploreMapMarkerAvatar item={item} isActive={isActive} />
              </button>
            </Marker>
          );
        })}

        {userLocation ? (
          <Marker longitude={userLocation.longitude} latitude={userLocation.latitude} anchor="center">
            <div className="h-4 w-4 rounded-full border-2 border-white bg-[#0E2A47] shadow-[0_0_0_4px_rgba(14,42,71,0.2)]" />
          </Marker>
        ) : null}

        {selectedItem ? (
          <Popup
            longitude={selectedItem.longitude}
            latitude={selectedItem.latitude}
            anchor="top"
            closeOnClick={false}
            onClose={handlePopupClose}
            offset={14}
          >
            <ExploreMapPopupCard item={selectedItem} />
          </Popup>
        ) : null}
      </MapView>
      {results.length > 0 && items.length === 0 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-4">
          <p className="rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[#0E2A47] shadow-sm">
            Estos resultados no tienen coordenadas para mostrarse en el mapa.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default memo(ExploreMap);
