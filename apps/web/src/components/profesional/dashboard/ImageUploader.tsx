'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { uploadProfessionalImage } from '@/services/professionalImageUpload';
import type { ProfessionalImageKind } from '@/services/professionalImageUpload';
import { resolveAssetUrl } from '@/utils/assetUrl';

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
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
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
    (event: React.ChangeEvent<HTMLInputElement>) => {
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
          className={`${previewClasses} overflow-hidden border border-[#E2E7EC] bg-white ${
            resolvedSrc ? '' : 'flex items-center justify-center'
          }`}
        >
          {resolvedSrc ? (
            <img
              src={resolvedSrc}
              alt={label || 'Imagen'}
              className="h-full w-full object-cover"
            />
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
      </div>
    </div>
  );
}
