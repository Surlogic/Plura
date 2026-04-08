const APP_SCHEME = 'plura';

const isEmptyEntry = (value: string | null | undefined) => {
  return !value || value === '/' || value === '//' || value === '///';
};

export function redirectSystemPath({
  path,
}: {
  initial: boolean;
  path: string;
}) {
  try {
    if (!path) {
      return '/';
    }

    if (!path.includes('://')) {
      return isEmptyEntry(path) ? '/' : path;
    }

    const url = new URL(path);
    const scheme = url.protocol.replace(':', '');
    const normalizedPath = `${url.pathname || ''}${url.search}${url.hash}`;

    if (scheme === APP_SCHEME && isEmptyEntry(url.pathname)) {
      return '/';
    }

    return isEmptyEntry(normalizedPath) ? '/' : normalizedPath;
  } catch {
    return '/';
  }
}
