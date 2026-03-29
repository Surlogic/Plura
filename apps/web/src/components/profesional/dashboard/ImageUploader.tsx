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
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [shouldOpenEditorAfterUpload, setShouldOpenEditorAfterUpload] = useState(false);

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
        if (onPresentationChange && (variant === 'circle' || variant === 'banner')) {
          setShouldOpenEditorAfterUpload(true);
        }
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
    setIsEditorOpen(false);
    setShouldOpenEditorAfterUpload(false);
    onChange('');
  }, [localPreview, onChange]);

  useEffect(() => {
    if (!shouldOpenEditorAfterUpload || !canAdjustPresentation) return;
    setIsEditorOpen(true);
    setShouldOpenEditorAfterUpload(false);
  }, [canAdjustPresentation, shouldOpenEditorAfterUpload]);

  useEffect(() => {
    if (resolvedSrc) return;
    setIsEditorOpen(false);
    setShouldOpenEditorAfterUpload(false);
  }, [resolvedSrc]);

  useEffect(() => {
    if (!isEditorOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsEditorOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditorOpen]);

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

  const editorPreviewClasses =
    variant === 'banner'
      ? 'h-[240px] w-full rounded-[24px] sm:h-[320px]'
      : 'mx-auto h-[280px] w-[280px] rounded-full sm:h-[320px] sm:w-[320px]';

  const handleResetPresentation = useCallback(() => {
    onPresentationChange?.({
      positionX: 50,
      positionY: 50,
      zoom: 1,
    });
  }, [onPresentationChange]);

  const renderImagePreview = (mode: 'inline' | 'editor') => {
    const classes = mode === 'editor' ? editorPreviewClasses : previewClasses;
    const interactive = mode === 'editor' && canAdjustPresentation && !disabled && !isUploading;

    return (
      <div
        ref={mode === 'editor' ? previewRef : null}
        className={`${classes} overflow-hidden border border-[#E2E7EC] bg-white ${
          resolvedSrc ? '' : 'flex items-center justify-center'
        } ${interactive ? 'cursor-crosshair touch-none' : ''}`}
        onPointerDown={interactive ? handlePreviewPointerDown : undefined}
        onPointerMove={interactive ? handlePreviewPointerMove : undefined}
        onPointerUp={interactive ? handlePreviewPointerEnd : undefined}
        onPointerCancel={interactive ? handlePreviewPointerEnd : undefined}
      >
        {resolvedSrc ? (
          <div className="relative h-full w-full">
            <img
              src={resolvedSrc}
              alt={label || 'Imagen'}
              className="h-full w-full object-cover"
              style={buildProfessionalMediaStyle(normalizedPresentation)}
            />
            {mode === 'editor' && canAdjustPresentation ? (
              <div className="pointer-events-none absolute inset-0" aria-hidden="true">
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
    );
  };

  return (
    <>
      <div className={className}>
        {label ? (
          <label className="mb-1 block text-sm font-medium text-[#0E2A47]">
            {label}
          </label>
        ) : null}

        <div className="mt-2 rounded-[16px] border border-[#E2E7EC] bg-[#F8FAFC] p-3">
          {renderImagePreview('inline')}

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
              <>
                {canAdjustPresentation ? (
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(true)}
                    disabled={disabled || isUploading}
                    className="rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-xs font-semibold text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-sm disabled:pointer-events-none disabled:opacity-50"
                  >
                    Editar encuadre
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={disabled || isUploading}
                  className="rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-xs font-semibold text-[#64748B] transition hover:-translate-y-0.5 hover:shadow-sm disabled:pointer-events-none disabled:opacity-50"
                >
                  Quitar
                </button>
              </>
            ) : null}
            <p className="text-xs text-[#64748B]">
              {hint || 'jpg, png, webp. Máximo 1MB.'}
            </p>
          </div>
        </div>
      </div>

      {isEditorOpen && canAdjustPresentation ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center px-4 py-6">
          <button
            type="button"
            className="absolute inset-0 bg-[#0B1D2A]/45 backdrop-blur-sm"
            onClick={() => setIsEditorOpen(false)}
            aria-label={`Cerrar editor de ${label || 'imagen'}`}
          />
          <div className="relative w-full max-w-4xl rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_28px_70px_rgba(15,23,42,0.25)] sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#64748B]">
                  Editor visual
                </p>
                <h3 className="mt-1 text-xl font-semibold text-[#0E2A47]">
                  Ajustar {label?.toLowerCase() || 'imagen'}
                </h3>
                <p className="mt-2 max-w-2xl text-sm text-[#64748B]">
                  Arrastrá dentro del marco para centrar la parte visible. El cambio se guarda junto con el perfil.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleResetPresentation}
                  className="rounded-full border border-[#E2E7EC] bg-white px-4 py-2 text-sm font-semibold text-[#0E2A47] transition hover:-translate-y-0.5 hover:shadow-sm"
                >
                  Recentrar
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="rounded-full bg-[#0B1D2A] px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-sm"
                >
                  Listo
                </button>
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-[#E2E7EC] bg-[#F8FAFC] p-4 sm:p-5">
              {renderImagePreview('editor')}
            </div>

            <div className="mt-5 grid gap-3 rounded-[20px] border border-[#E2E7EC] bg-[#F8FAFC] p-4 sm:grid-cols-3 sm:items-end">
              <label className="grid gap-1 text-xs text-[#64748B] sm:col-span-3">
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
              <div className="rounded-[16px] border border-[#E2E7EC] bg-white px-4 py-3 text-sm text-[#64748B]">
                El editor solo aparece al subir/reemplazar o al tocar <span className="font-semibold text-[#0E2A47]">Editar encuadre</span>.
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
