import type { CSSProperties } from 'react';
import type { ProfessionalMediaPresentation } from '@/types/professional';
import { resolveAssetUrl } from '@/utils/assetUrl';
import { buildProfessionalMediaStyle } from '@/utils/professionalMediaPresentation';

export type PublicBusinessImageKind = 'banner' | 'photo' | 'legacy' | 'service';

export type PublicBusinessImageCandidate = {
  key: string;
  kind: PublicBusinessImageKind;
  media?: ProfessionalMediaPresentation | null;
  src: string;
};

export type PublicBusinessLogo = {
  media?: ProfessionalMediaPresentation | null;
  src: string;
};

type ResolvePublicBusinessMediaInput = {
  bannerMedia?: ProfessionalMediaPresentation | null;
  bannerUrl?: string | null;
  fallbackPhotoUrl?: string | null;
  imageUrl?: string | null;
  includeServiceImageFallback?: boolean;
  logoMedia?: ProfessionalMediaPresentation | null;
  logoUrl?: string | null;
  name?: string | null;
  photoUrls?: Array<string | null | undefined>;
  serviceImageUrl?: string | null;
};

export type ResolvedPublicBusinessMedia = {
  initials: string;
  logo: PublicBusinessLogo | null;
  mainImageCandidates: PublicBusinessImageCandidate[];
};

const sanitizeMediaUrl = (value?: string | null) => {
  const resolved = resolveAssetUrl(value);
  return resolved || '';
};

const pushCandidate = (
  candidates: PublicBusinessImageCandidate[],
  seen: Set<string>,
  next: Omit<PublicBusinessImageCandidate, 'key'>,
) => {
  if (!next.src || seen.has(next.src)) {
    return;
  }
  seen.add(next.src);
  candidates.push({
    ...next,
    key: `${next.kind}:${next.src}`,
  });
};

export const getPublicBusinessInitials = (value?: string | null) => {
  const words = (value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (words.length === 0) {
    return 'PL';
  }
  return words
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase();
};

export const resolvePublicBusinessMedia = ({
  bannerMedia,
  bannerUrl,
  fallbackPhotoUrl,
  imageUrl,
  includeServiceImageFallback = false,
  logoMedia,
  logoUrl,
  name,
  photoUrls = [],
  serviceImageUrl,
}: ResolvePublicBusinessMediaInput): ResolvedPublicBusinessMedia => {
  const candidates: PublicBusinessImageCandidate[] = [];
  const seen = new Set<string>();

  const resolvedBannerUrl = sanitizeMediaUrl(bannerUrl);
  const resolvedFallbackPhotoUrl = sanitizeMediaUrl(fallbackPhotoUrl);
  const resolvedLegacyImageUrl = sanitizeMediaUrl(imageUrl);
  const resolvedServiceImageUrl = sanitizeMediaUrl(serviceImageUrl);
  const resolvedLogoUrl = sanitizeMediaUrl(logoUrl);

  pushCandidate(candidates, seen, {
    kind: 'banner',
    src: resolvedBannerUrl,
    media: bannerMedia,
  });
  pushCandidate(candidates, seen, {
    kind: 'photo',
    src: resolvedFallbackPhotoUrl,
  });

  photoUrls.forEach((photoUrl) => {
    pushCandidate(candidates, seen, {
      kind: 'photo',
      src: sanitizeMediaUrl(photoUrl),
    });
  });

  pushCandidate(candidates, seen, {
    kind: 'legacy',
    src: resolvedLegacyImageUrl,
  });

  if (includeServiceImageFallback) {
    pushCandidate(candidates, seen, {
      kind: 'service',
      src: resolvedServiceImageUrl,
    });
  }

  return {
    initials: getPublicBusinessInitials(name),
    logo: resolvedLogoUrl
      ? {
          src: resolvedLogoUrl,
          media: logoMedia,
        }
      : null,
    mainImageCandidates: candidates,
  };
};

export const buildPublicBusinessImageStyle = (
  candidate?: PublicBusinessImageCandidate | null,
): CSSProperties | undefined => {
  if (!candidate || candidate.kind !== 'banner') {
    return undefined;
  }
  return buildProfessionalMediaStyle(candidate.media);
};

export const buildPublicBusinessLogoStyle = (
  logo?: PublicBusinessLogo | null,
): CSSProperties | undefined => {
  if (!logo) {
    return undefined;
  }
  return buildProfessionalMediaStyle(logo.media);
};
