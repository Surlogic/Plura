'use client';
/* eslint-disable no-restricted-syntax */

import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import mapboxgl from 'mapbox-gl';
import Map, { type MapProps, type MapRef } from 'react-map-gl/mapbox';

const MAPBOX_TOKEN = (process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '').trim();
const DEFAULT_MAP_STYLE = 'mapbox://styles/mapbox/light-v11';

type MapViewProps = Omit<MapProps, 'mapboxAccessToken' | 'mapStyle' | 'ref'> & {
  mapRef?: React.MutableRefObject<MapRef | null>;
  mapStyle?: string;
  containerClassName?: string;
  fallbackClassName?: string;
  fallbackMessage?: string;
  webglFallbackMessage?: string;
};

type MapRuntimeBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
  onRuntimeError?: () => void;
};

type MapRuntimeBoundaryState = {
  hasError: boolean;
};

class MapRuntimeBoundary extends Component<MapRuntimeBoundaryProps, MapRuntimeBoundaryState> {
  constructor(props: MapRuntimeBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): MapRuntimeBoundaryState {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onRuntimeError?.();
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const detectWebGlSupport = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }

  try {
    if (typeof mapboxgl.supported === 'function') {
      return mapboxgl.supported({ failIfMajorPerformanceCaveat: false });
    }
  } catch {
    // Sigue con fallback manual.
  }

  try {
    const canvas = document.createElement('canvas');
    const context =
      canvas.getContext('webgl2')
      || canvas.getContext('webgl')
      || canvas.getContext('experimental-webgl');

    return Boolean(context);
  } catch {
    return false;
  }
};

export default function MapView({
  mapRef,
  mapStyle = DEFAULT_MAP_STYLE,
  containerClassName = '',
  fallbackClassName = '',
  fallbackMessage = 'Falta `NEXT_PUBLIC_MAPBOX_TOKEN` para mostrar el mapa.',
  webglFallbackMessage = 'Este dispositivo o navegador no pudo inicializar el mapa.',
  onLoad,
  onError,
  ...props
}: MapViewProps) {
  const internalMapRef = useRef<MapRef | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  const [mapFailed, setMapFailed] = useState(false);

  const setMapRef = useCallback(
    (instance: MapRef | null) => {
      internalMapRef.current = instance;
      if (mapRef) {
        mapRef.current = instance;
      }
    },
    [mapRef],
  );

  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => {
      internalMapRef.current?.resize();
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setWebglSupported(detectWebGlSupport());
  }, []);

  if (!MAPBOX_TOKEN) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center px-4 text-center text-sm text-[#64748B] ${fallbackClassName}`}
      >
        {fallbackMessage}
      </div>
    );
  }

  if (webglSupported === null) {
    return <div ref={containerRef} className={`h-full w-full ${containerClassName}`} />;
  }

  if (!webglSupported || mapFailed) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center px-4 text-center text-sm text-[#64748B] ${fallbackClassName}`}
      >
        {webglFallbackMessage}
      </div>
    );
  }

  const webglFallback = (
    <div
      className={`flex h-full w-full items-center justify-center px-4 text-center text-sm text-[#64748B] ${fallbackClassName}`}
    >
      {webglFallbackMessage}
    </div>
  );

  return (
    <div ref={containerRef} className={`h-full w-full ${containerClassName}`}>
      <MapRuntimeBoundary fallback={webglFallback} onRuntimeError={() => setMapFailed(true)}>
        <Map
          ref={setMapRef}
          mapStyle={mapStyle}
          mapboxAccessToken={MAPBOX_TOKEN}
          onError={(event) => {
            const message = event.error?.message || '';
            if (
              message.includes('WebGL')
              || message.includes('Failed to initialize')
            ) {
              setMapFailed(true);
            }
            onError?.(event);
          }}
          onLoad={(event) => {
            internalMapRef.current?.resize();
            onLoad?.(event);
          }}
          {...props}
        />
      </MapRuntimeBoundary>
    </div>
  );
}
