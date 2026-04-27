import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { SearchItem } from '@/types/search';
import {
  Layer,
  Marker,
  NavigationControl,
  Popup,
  Source,
  type LayerProps,
  type MapMouseEvent,
  type MapRef,
} from 'react-map-gl/mapbox';
import mapboxgl from 'mapbox-gl';
import MapView from '@/components/map/MapView';
import ExploreLeafletFallbackMap from '@/components/explorar/ExploreLeafletFallbackMap';
import {
  buildPublicBusinessLogoStyle,
  getPublicBusinessInitials,
  resolvePublicBusinessMedia,
} from '@/utils/publicBusinessMedia';

type ExploreMapItem = {
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
  logoSrc?: string | null;
  logoStyle?: CSSProperties;
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
  onSelectResult?: (id: string | null) => void;
  onViewportCenterChange?: (center: { latitude: number; longitude: number }) => void;
};

const DEFAULT_CENTER = {
  latitude: -34.9011,
  longitude: -56.1645,
};
const MAP_SOURCE_ID = 'plura-professionals';
const CLUSTER_LAYER_ID = 'plura-clusters';
const CLUSTER_COUNT_LAYER_ID = 'plura-clusters-count';
const UNCLUSTERED_LAYER_ID = 'plura-unclustered-points';
const INTERACTIVE_LAYER_IDS = [
  CLUSTER_LAYER_ID,
];
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

const clusterLayer: LayerProps = {
  id: CLUSTER_LAYER_ID,
  type: 'circle',
  source: MAP_SOURCE_ID,
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': '#0E2A47',
    'circle-radius': ['step', ['get', 'point_count'], 18, 10, 22, 30, 26, 60, 30],
    'circle-opacity': 0.88,
    'circle-stroke-width': 2,
    'circle-stroke-color': '#FFFFFF',
  },
};

const clusterCountLayer: LayerProps = {
  id: CLUSTER_COUNT_LAYER_ID,
  type: 'symbol',
  source: MAP_SOURCE_ID,
  filter: ['has', 'point_count'],
  layout: {
    'text-field': ['get', 'point_count_abbreviated'],
    'text-size': 12,
    'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
  },
  paint: {
    'text-color': '#FFFFFF',
  },
};

const unclusteredLayer: LayerProps = {
  id: UNCLUSTERED_LAYER_ID,
  type: 'circle',
  source: MAP_SOURCE_ID,
  filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-color': '#0E2A47',
    'circle-radius': 24,
    'circle-opacity': 0.01,
    'circle-stroke-width': 1,
    'circle-stroke-opacity': 0.01,
    'circle-stroke-color': '#0E2A47',
  },
};

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
  const showLogo = Boolean(item.logoSrc) && !hasLogoError;

  useEffect(() => {
    setHasLogoError(false);
  }, [item.logoSrc]);

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
            src={item.logoSrc || ''}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
            style={item.logoStyle}
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
  onSelectResult,
  onViewportCenterChange,
}: ExploreMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const lastSelectionFocusRef = useRef<string | null>(null);
  const lastAutoViewportKeyRef = useRef<string | null>(null);
  const userInteractedSinceResultsRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [visibleMarkerIds, setVisibleMarkerIds] = useState<string[]>([]);
  const [cursor, setCursor] = useState<'default' | 'pointer'>('default');

  const items = useMemo<ExploreMapItem[]>(
    () => {
      const mapped: ExploreMapItem[] = [];
      results.forEach((item) => {
        const latitude = parseOptionalNumber(item.latitude);
        const longitude = parseOptionalNumber(item.longitude);
        if (latitude === null || longitude === null) return;
        const publicMedia = resolvePublicBusinessMedia({
          logoMedia: item.logoMedia,
          logoUrl: item.logoUrl,
          fallbackPhotoUrl: item.fallbackPhotoUrl,
          imageUrl: item.coverImageUrl,
          name: item.name,
        });

        mapped.push({
          id: String(item.id),
          slug: item.slug || String(item.id),
          name: item.name || 'Profesional',
          category:
            Array.isArray(item.categorySlugs) && item.categorySlugs.length > 0
              ? humanizeSlug(item.categorySlugs[0])
              : 'Profesional',
          rating: parseOptionalNumber(item.rating),
          reviewsCount: typeof item.reviewsCount === 'number' ? item.reviewsCount : null,
          priceFrom: parseOptionalNumber(item.priceFrom),
          latitude,
          longitude,
          locationText: item.locationText || null,
          logoSrc: publicMedia.logo?.src || null,
          logoStyle: buildPublicBusinessLogoStyle(publicMedia.logo),
          initials: publicMedia.initials || getPublicBusinessInitials(item.name),
        });
      });
      return mapped;
    },
    [results],
  );

  const geojson = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: items.map((item) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [item.longitude, item.latitude] as [number, number],
        },
        properties: {
          id: item.id,
        },
      })),
    }),
    [items],
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

  const visibleMarkers = useMemo(
    () => items.filter((item) => visibleMarkerIds.includes(item.id)),
    [items, visibleMarkerIds],
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
  const emitViewportCenter = useCallback(() => {
    const center = mapRef.current?.getCenter();
    if (!center) return;
    onViewportCenterChange?.({
      latitude: center.lat,
      longitude: center.lng,
    });
  }, [onViewportCenterChange]);

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
    if (!mapReady || !mapRef.current || !onViewportCenterChange) return undefined;

    const map = mapRef.current.getMap();
    const handleMoveEnd = () => {
      emitViewportCenter();
    };

    emitViewportCenter();
    map.on('moveend', handleMoveEnd);

    return () => {
      map.off('moveend', handleMoveEnd);
    };
  }, [emitViewportCenter, mapReady, onViewportCenterChange]);

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

    const bounds = new mapboxgl.LngLatBounds();
    items.forEach((item) => bounds.extend([item.longitude, item.latitude]));
    if (userLocation) {
      bounds.extend([userLocation.longitude, userLocation.latitude]);
    }

    mapRef.current.fitBounds(bounds, {
      padding: 64,
      duration: 650,
      maxZoom: 14,
    });
  }, [items, mapReady, preferUserLocationViewport, userLocation, viewportKey]);

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
    emitViewportCenter();
  }, [emitViewportCenter, hideVisualNoiseLayers]);

  const syncVisibleMarkers = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map || !map.isStyleLoaded()) return;

    try {
      const { clientWidth, clientHeight } = map.getContainer();
      const features = map.queryRenderedFeatures([[0, 0], [clientWidth, clientHeight]], {
        layers: [UNCLUSTERED_LAYER_ID],
      });
      const nextIds = Array.from(
        new Set(
          features
            .map((feature) => String(feature.properties?.id || ''))
            .filter(Boolean),
        ),
      );
      setVisibleMarkerIds((current) => {
        if (
          current.length === nextIds.length
          && current.every((value, index) => value === nextIds[index])
        ) {
          return current;
        }
        return nextIds;
      });
    } catch {
      // El source puede no estar listo en frames intermedios.
    }
  }, []);

  const handleMapClick = useCallback((event: MapMouseEvent) => {
    const features = (event as MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] })
      .features;
    const feature = features?.[0];
    if (!feature) {
      onSelectResult?.(null);
      return;
    }
    const layerId = feature.layer?.id || '';

    if (layerId === CLUSTER_LAYER_ID) {
      const clusterId = Number(feature.properties?.cluster_id);
      if (!Number.isFinite(clusterId)) return;

      const map = mapRef.current?.getMap();
      const source = map?.getSource(MAP_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
      if (!map || !source) return;

      source.getClusterExpansionZoom(clusterId, (error, zoom) => {
        if (error || typeof zoom !== 'number') return;
        const coordinates = (feature.geometry as { coordinates?: number[] }).coordinates;
        if (!Array.isArray(coordinates) || coordinates.length < 2) return;
        const [lng, lat] = coordinates as [number, number];
        map.easeTo({
          center: [lng, lat],
          zoom,
          duration: 450,
        });
      });
      return;
    }
  }, [onSelectResult]);

  const handleMapMouseMove = useCallback((event: MapMouseEvent) => {
    const features = (event as MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] })
      .features;
    const hasInteractiveFeature = features?.some(
      (item) => item.layer?.id === CLUSTER_LAYER_ID,
    );
    setCursor(hasInteractiveFeature ? 'pointer' : 'default');
  }, []);

  const handleMapMouseLeave = useCallback(() => {
    setCursor('default');
  }, []);

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
      />
    ),
    [items, onSelectResult, selectedResultId, selectionRequestNonce, userLocation],
  );

  useEffect(() => {
    if (!mapReady || !mapRef.current) return undefined;

    const map = mapRef.current.getMap();
    const handleIdle = () => {
      syncVisibleMarkers();
    };

    map.on('idle', handleIdle);
    syncVisibleMarkers();
    const frameId = window.requestAnimationFrame(() => {
      syncVisibleMarkers();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      map.off('idle', handleIdle);
    };
  }, [mapReady, syncVisibleMarkers, geojson]);

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
        onMouseMove={handleMapMouseMove}
        onMouseLeave={handleMapMouseLeave}
        interactiveLayerIds={INTERACTIVE_LAYER_IDS}
        cursor={cursor}
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

        <Source
          id={MAP_SOURCE_ID}
          type="geojson"
          data={geojson}
          cluster
          clusterRadius={46}
          clusterMaxZoom={14}
        >
          {/* eslint-disable-next-line no-restricted-syntax -- react-map-gl Layer expects props object */}
          <Layer {...clusterLayer} />
          {/* eslint-disable-next-line no-restricted-syntax -- react-map-gl Layer expects props object */}
          <Layer {...clusterCountLayer} />
          {/* eslint-disable-next-line no-restricted-syntax -- react-map-gl Layer expects props object */}
          <Layer {...unclusteredLayer} />
        </Source>

        {visibleMarkers.map((item) => {
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
            <div className="min-w-[220px] max-w-[240px] space-y-2">
              <div className="flex items-start gap-3">
                <div className="shrink-0">
                  <ExploreMapMarkerAvatar item={selectedItem} isActive showRating={false} />
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-semibold text-[#0E2A47]">{selectedItem.name}</p>
                  <p className="truncate text-xs text-[#64748B]">{selectedItem.category || 'Profesional'}</p>
                  <div className="flex items-center gap-2 text-xs text-[#334155]">
                    <span className="inline-flex items-center rounded-full bg-[#FFF7E7] px-2 py-0.5 font-semibold text-[#8A5A00]">
                      <span className="mr-1 text-[#E59C17]">★</span>
                      {typeof selectedItem.rating === 'number' && selectedItem.rating > 0
                        ? selectedItem.rating.toFixed(1)
                        : 'Sin rating'}
                    </span>
                    {selectedItem.reviewsCount && selectedItem.reviewsCount > 0 ? (
                      <span className="text-[#64748B]">
                        {selectedItem.reviewsCount} reseñas
                      </span>
                    ) : null}
                  </div>
                </div>
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
