import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { SearchItem } from '@/types/search';
import Map, {
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

type ExploreMapItem = {
  id: string;
  slug: string;
  name: string;
  category: string;
  rating?: number | null;
  priceFrom?: number | null;
  latitude: number;
  longitude: number;
  locationText?: string | null;
};

type ExploreMapProps = {
  results: SearchItem[];
  userLocation?: {
    latitude: number;
    longitude: number;
  };
};

const MAPBOX_TOKEN = (process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '').trim();
const MAPBOX_STYLE = 'mapbox://styles/mapbox/light-v11';
const DEFAULT_CENTER = {
  latitude: -34.9011,
  longitude: -56.1645,
};
const MAP_SOURCE_ID = 'plura-professionals';
const CLUSTER_LAYER_ID = 'plura-clusters';
const CLUSTER_COUNT_LAYER_ID = 'plura-clusters-count';
const UNCLUSTERED_LAYER_ID = 'plura-unclustered-points';
const INTERACTIVE_LAYER_IDS = [CLUSTER_LAYER_ID, UNCLUSTERED_LAYER_ID];
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
    'circle-radius': [
      'step',
      ['get', 'point_count'],
      18,
      10,
      22,
      30,
      26,
      60,
      30,
    ],
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
    'circle-color': '#1FB6A6',
    'circle-radius': 8,
    'circle-stroke-width': 2,
    'circle-stroke-color': '#FFFFFF',
  },
};

const formatPriceFrom = (value?: number | null) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 'Ver perfil';
  const rounded = Math.round(value);
  return `Desde $${new Intl.NumberFormat('es-UY').format(rounded)}`;
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

export default function ExploreMap({ results, userLocation }: ExploreMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [cursor, setCursor] = useState<'default' | 'pointer'>('default');

  const items = useMemo<ExploreMapItem[]>(
    () => {
      const mapped: ExploreMapItem[] = [];
      results.forEach((item) => {
        const latitude = parseOptionalNumber(item.latitude);
        const longitude = parseOptionalNumber(item.longitude);
        if (latitude === null || longitude === null) return;

        mapped.push({
          id: String(item.id),
          slug: item.slug || String(item.id),
          name: item.name || 'Profesional',
          category:
            Array.isArray(item.categorySlugs) && item.categorySlugs.length > 0
              ? humanizeSlug(item.categorySlugs[0])
              : 'Profesional',
          rating: parseOptionalNumber(item.rating),
          priceFrom: parseOptionalNumber(item.priceFrom),
          latitude,
          longitude,
          locationText: item.locationText || null,
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

  const selectedItem = useMemo(
    () => {
      const activeId = pinnedId || hoveredId;
      if (!activeId) return null;
      return items.find((item) => item.id === activeId) || null;
    },
    [items, pinnedId, hoveredId],
  );

  useEffect(() => {
    if (pinnedId && !items.some((item) => item.id === pinnedId)) {
      setPinnedId(null);
    }
    if (hoveredId && !items.some((item) => item.id === hoveredId)) {
      setHoveredId(null);
    }
  }, [items, pinnedId, hoveredId]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || items.length === 0) return;

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
  }, [items, mapReady, userLocation]);

  const hideVisualNoiseLayers = () => {
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
  };

  const handleMapLoad = () => {
    setMapReady(true);
    hideVisualNoiseLayers();
  };

  const handleMapClick = (event: MapMouseEvent) => {
    const features = (event as MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] })
      .features;
    const feature = features?.[0];
    if (!feature) {
      setPinnedId(null);
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

    if (layerId === UNCLUSTERED_LAYER_ID) {
      const clickedId = String(feature.properties?.id || '');
      if (!clickedId) return;
      setPinnedId(clickedId);
      setHoveredId(clickedId);
    }
  };

  const handleMapMouseMove = (event: MapMouseEvent) => {
    const features = (event as MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] })
      .features;
    const feature = features?.find(
      (item) =>
        item.layer?.id === UNCLUSTERED_LAYER_ID || item.layer?.id === CLUSTER_LAYER_ID,
    );
    if (!feature) {
      setCursor('default');
      setHoveredId(null);
      return;
    }

    setCursor('pointer');
    if (feature.layer?.id === UNCLUSTERED_LAYER_ID) {
      const nextHoveredId = String(feature.properties?.id || '');
      setHoveredId(nextHoveredId || null);
      return;
    }

    setHoveredId(null);
  };

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-[20px] bg-[#E9EEF2] px-4 text-center text-sm text-[#6B7280]">
        Falta `NEXT_PUBLIC_MAPBOX_TOKEN` para mostrar el mapa.
      </div>
    );
  }

  return (
    <div className="relative h-[420px] overflow-hidden rounded-[20px] border border-[#DCE5ED]">
      <Map
        ref={mapRef}
        initialViewState={{
          latitude: userLocation?.latitude ?? DEFAULT_CENTER.latitude,
          longitude: userLocation?.longitude ?? DEFAULT_CENTER.longitude,
          zoom: userLocation ? 11 : 10,
        }}
        onLoad={handleMapLoad}
        onClick={handleMapClick}
        onMouseMove={handleMapMouseMove}
        onMouseLeave={() => {
          setCursor('default');
          setHoveredId(null);
        }}
        interactiveLayerIds={INTERACTIVE_LAYER_IDS}
        cursor={cursor}
        mapStyle={MAPBOX_STYLE}
        mapboxAccessToken={MAPBOX_TOKEN}
        dragRotate={false}
        touchZoomRotate={false}
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
          <Layer {...clusterLayer} />
          <Layer {...clusterCountLayer} />
          <Layer {...unclusteredLayer} />
        </Source>

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
            onClose={() => {
              setPinnedId(null);
              setHoveredId(null);
            }}
            offset={14}
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
                    ? `★ ${selectedItem.rating.toFixed(1)}`
                    : 'Sin reseñas'}
                </span>
                <span>{formatPriceFrom(selectedItem.priceFrom)}</span>
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
      </Map>
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
