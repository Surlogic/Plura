'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from 'react';
import { uploadProfessionalImage } from '@/services/professionalImageUpload';
import type { ProfessionalImageKind } from '@/services/professionalImageUpload';
import type { ProfessionalMediaPresentation } from '@/types/professional';
import { resolveAssetUrl } from '@/utils/assetUrl';
import {
  buildProfessionalMediaStyle,
  normalizeProfessionalMediaPresentation,
  roundProfessionalMediaZoom,
} from '@/utils/professionalMediaPresentation';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

type ImageUploaderProps = {
  /** Current persisted URL or recently uploaded URL */
  value: string;
  /** Called with the new URL after a successful upload, or empty string on remove */
  onChange: (url: string) => void;
  /** Upload kind sent to the backend */
  kind: ProfessionalImageKind;
  /** Visual variant */
  variant?: 'square' | 'circle' | 'banner';
  /** Label shown above the uploader */
  label?: string;
  /** Extra hint shown below the buttons */
  hint?: string;
  /** Disable interaction */
  disabled?: boolean;
  /** Custom className for the outer wrapper */
  className?: string;
  /** Persisted presentation for circle/banner images */
  presentation?: ProfessionalMediaPresentation | null;
  /** Called when presentation controls change */
  onPresentationChange?: (presentation: ProfessionalMediaPresentation) => void;
};

export default function ImageUploader({
  value,
  onChange,
  kind,
  variant = 'square',
  label,
  hint,
  disabled = false,
  className = '',
  presentation,
  onPresentationChange,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState('');
  const [error, setError] = useState('');

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (localPreview.startsWith('blob:')) {
        URL.revokeObjectURL(localPreview);
      }
    };
  }, [localPreview]);

  const displayUrl = localPreview || value;
  const resolvedSrc = displayUrl ? resolveAssetUrl(displayUrl) : '';
  const normalizedPresentation = useMemo(
    () => normalizeProfessionalMediaPresentation(presentation),
    [presentation],
  );
  const canAdjustPresentation = Boolean(
    resolvedSrc &&
      !localPreview &&
      onPresentationChange &&
      (variant === 'circle' || variant === 'banner'),
  );

  const handleFileSelected = useCallback(
    async (file: File) => {
      setError('');
      const normalizedType = (file.type || '').trim().toLowerCase();
      if (!ALLOWED_MIME_TYPES.includes(normalizedType)) {
        setError('Formato inválido. Solo jpg, png o webp.');
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError('La imagen supera 1MB.');
        return;
      }

      // Show local preview immediately
      if (localPreview.startsWith('blob:')) {
        URL.revokeObjectURL(localPreview);
      }
      const preview = URL.createObjectURL(file);
      setLocalPreview(preview);
      setIsUploading(true);

      try {
        const imageUrl = await uploadProfessionalImage(file, kind);
        if (!imageUrl) {
          throw new Error('empty_image_url');
        }
        setLocalPreview('');
        onChange(imageUrl);
      } catch {
        setError('No se pudo subir la imagen.');
        setLocalPreview('');
      } finally {
        setIsUploading(false);
      }
    },
    [kind, localPreview, onChange],
  );

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (file) {
        void handleFileSelected(file);
      }
    },
    [handleFileSelected],
  );

  const handleRemove = useCallback(() => {
    if (localPreview.startsWith('blob:')) {
      URL.revokeObjectURL(localPreview);
    }
    setLocalPreview('');
    setError('');
    onChange('');
  }, [localPreview, onChange]);

  const updatePresentationFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      if (!canAdjustPresentation || !previewRef.current || !onPresentationChange) return;
      const rect = previewRef.current.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const positionX = ((clientX - rect.left) / rect.width) * 100;
      const positionY = ((clientY - rect.top) / rect.height) * 100;
      onPresentationChange(
        normalizeProfessionalMediaPresentation({
          ...normalizedPresentation,
          positionX,
          positionY,
        }),
      );
    },
    [canAdjustPresentation, normalizedPresentation, onPresentationChange],
  );

  const handlePreviewPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!canAdjustPresentation || disabled || isUploading) return;
      activePointerIdRef.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      updatePresentationFromPointer(event.clientX, event.clientY);
    },
    [canAdjustPresentation, disabled, isUploading, updatePresentationFromPointer],
  );

  const handlePreviewPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (activePointerIdRef.current !== event.pointerId) return;
      updatePresentationFromPointer(event.clientX, event.clientY);
    },
    [updatePresentationFromPointer],
  );

  const handlePreviewPointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (activePointerIdRef.current !== event.pointerId) return;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      activePointerIdRef.current = null;
    },
    [],
  );

  const previewClasses =
    variant === 'banner'
      ? 'h-32 w-full rounded-[18px]'
      : variant === 'circle'
        ? 'h-20 w-20 rounded-full'
        : 'h-28 w-28 rounded-[18px]';

  return (
    <div className={className}>
      {label ? (
        <label className="mb-1 block text-sm font-medium text-[#0E2A47]">
          {label}
        </label>
      ) : null}

      <div className="mt-2 rounded-[16px] border border-[#E2E7EC] bg-[#F8FAFC] p-3">
        {/* Preview */}
        <div
          ref={previewRef}
          className={`${previewClasses} overflow-hidden border border-[#E2E7EC] bg-white ${
            resolvedSrc ? '' : 'flex items-center justify-center'
          } ${
            canAdjustPresentation && !disabled && !isUploading ? 'cursor-crosshair touch-none' : ''
          }`}
          onPointerDown={handlePreviewPointerDown}
          onPointerMove={handlePreviewPointerMove}
          onPointerUp={handlePreviewPointerEnd}
          onPointerCancel={handlePreviewPointerEnd}
        >
          {resolvedSrc ? (
            <div className="relative h-full w-full">
              <img
                src={resolvedSrc}
                alt={label || 'Imagen'}
                className="h-full w-full object-cover"
                style={buildProfessionalMediaStyle(normalizedPresentation)}
              />
              {canAdjustPresentation ? (
                <div
                  className="pointer-events-none absolute inset-0"
                  aria-hidden="true"
                >
                  <div
                    className="absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/95 bg-[#1FB6A6]/35 shadow-[0_0_0_1px_rgba(14,42,71,0.18)]"
                    style={{
                      left: `${normalizedPresentation.positionX}%`,
                      top: `${normalizedPresentation.positionY}%`,
                    }}
                  />
                </div>
              ) : null}
            </div>
          ) : (
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">
              {variant === 'banner' ? 'Sin banner' : 'Sin imagen'}
            </span>
          )}
        </div>

        {/* Loading overlay */}
        {isUploading ? (
          <div className="mt-2 text-xs font-medium text-[#1FB6A6]">
            Subiendo imagen...
          </div>
        ) : null}

        {/* Error */}
        {error ? (
          <div className="mt-2 text-xs font-medium text-red-500">{error}</div>
        ) : null}

        {/* Actions */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label
            className={`cursor-pointer rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-xs font-semibold text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-sm ${
              disabled || isUploading ? 'pointer-events-none opacity-50' : ''
            }`}
          >
            {resolvedSrc ? 'Reemplazar' : 'Subir imagen'}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleInputChange}
              disabled={disabled || isUploading}
            />
          </label>
          {resolvedSrc ? (
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled || isUploading}
              className="rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-xs font-semibold text-[#64748B] transition hover:-translate-y-0.5 hover:shadow-sm disabled:pointer-events-none disabled:opacity-50"
            >
              Quitar
            </button>
          ) : null}
          <p className="text-xs text-[#64748B]">
            {hint || 'jpg, png, webp. Máximo 1MB.'}
          </p>
        </div>

        {canAdjustPresentation ? (
          <div className="mt-4 grid gap-3 rounded-[14px] border border-[#E2E7EC] bg-white/80 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                Encuadre
              </p>
              <button
                type="button"
                onClick={() =>
                  onPresentationChange?.({
                    positionX: 50,
                    positionY: 50,
                    zoom: 1,
                  })
                }
                disabled={disabled || isUploading}
                className="rounded-full border border-[#E2E7EC] bg-white px-3 py-1 text-[0.68rem] font-semibold text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-sm disabled:pointer-events-none disabled:opacity-50"
              >
                Recentrar
              </button>
            </div>
            <p className="text-xs text-[#64748B]">
              Arrastrá dentro del cuadro para elegir la zona visible. Después ajustá el zoom si querés acercar.
            </p>
            <label className="grid gap-1 text-xs text-[#64748B]">
              <span className="font-medium text-[#0E2A47]">
                Zoom {roundProfessionalMediaZoom(normalizedPresentation.zoom).toFixed(2)}x
              </span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={normalizedPresentation.zoom}
                disabled={disabled || isUploading}
                onChange={(event) =>
                  onPresentationChange?.(
                    normalizeProfessionalMediaPresentation({
                      ...normalizedPresentation,
                      zoom: Number(event.target.value),
                    }),
                  )
                }
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs text-[#64748B]">
                <span className="font-medium text-[#0E2A47]">Horizontal</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={Math.round(normalizedPresentation.positionX)}
                  disabled={disabled || isUploading}
                  onChange={(event) =>
                    onPresentationChange?.(
                      normalizeProfessionalMediaPresentation({
                        ...normalizedPresentation,
                        positionX: Number(event.target.value),
                      }),
                    )
                  }
                />
              </label>
              <label className="grid gap-1 text-xs text-[#64748B]">
                <span className="font-medium text-[#0E2A47]">Vertical</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={Math.round(normalizedPresentation.positionY)}
                  disabled={disabled || isUploading}
                  onChange={(event) =>
                    onPresentationChange?.(
                      normalizeProfessionalMediaPresentation({
                        ...normalizedPresentation,
                        positionY: Number(event.target.value),
                      }),
                    )
                  }
                />
              </label>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
