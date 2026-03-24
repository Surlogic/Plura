const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
const IMAGE_CDN_BASE_URL = (process.env.NEXT_PUBLIC_IMAGE_CDN_BASE_URL || 'https://img.surlogicuy.com').replace(/\/+$/, '');

const buildUrl = (baseUrl: string, pathOrKey: string) => {
  const sanitizedBase = (baseUrl || '').replace(/\/+$/, '');
  const sanitizedPath = pathOrKey.replace(/^\/+/, '');
  if (!sanitizedBase) {
    return sanitizedPath ? `/${sanitizedPath}` : '';
  }
  return sanitizedPath ? `${sanitizedBase}/${sanitizedPath}` : sanitizedBase;
};

const resolveR2Url = (value: string) => {
  const withoutProtocol = value.replace(/^r2:\/\//i, '');
  const firstSlash = withoutProtocol.indexOf('/');
  if (firstSlash < 0) return '';
  const objectKey = withoutProtocol.slice(firstSlash + 1).trim();
  return objectKey ? buildUrl(IMAGE_CDN_BASE_URL, objectKey) : '';
};

export const resolveAssetUrl = (value?: string | null) => {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  if (/^r2:\/\//i.test(trimmed)) {
    return resolveR2Url(trimmed);
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed;
    }
    return '';
  } catch {
    if (trimmed.startsWith('/')) {
      return buildUrl(API_BASE_URL, trimmed);
    }
    if (/^uploads\//i.test(trimmed)) {
      return buildUrl(API_BASE_URL, trimmed);
    }
    if (IMAGE_CDN_BASE_URL) {
      return buildUrl(IMAGE_CDN_BASE_URL, trimmed);
    }
    return buildUrl(API_BASE_URL, trimmed);
  }
};
