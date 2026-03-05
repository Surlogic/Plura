import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import api from '@/services/api';

type CachedGetOptions = {
  ttlMs?: number;
  staleWhileRevalidate?: boolean;
  cacheKey?: string;
  skipCache?: boolean;
};

type CachedResponseSnapshot = {
  data: unknown;
  status: number;
  statusText: string;
  headers: AxiosResponse['headers'];
};

type CacheEntry = {
  expiresAt: number;
  snapshot: CachedResponseSnapshot;
};

const DEFAULT_TTL_MS = 30000;
const EVICTION_INTERVAL_MS = 60000;
const responseCache = new Map<string, CacheEntry>();
const inflightRequests = new Map<string, Promise<AxiosResponse<unknown>>>();

let evictionTimer: ReturnType<typeof setInterval> | null = null;

const startEvictionIfNeeded = () => {
  if (evictionTimer || typeof window === 'undefined') return;
  evictionTimer = setInterval(() => {
    const now = Date.now();
    responseCache.forEach((entry, key) => {
      if (entry.expiresAt <= now) responseCache.delete(key);
    });
    if (responseCache.size === 0 && inflightRequests.size === 0) {
      clearInterval(evictionTimer!);
      evictionTimer = null;
    }
  }, EVICTION_INTERVAL_MS);
};

const stableSerialize = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const sortedEntries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return `{${sortedEntries
      .map(([key, item]) => `"${key}":${stableSerialize(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
};

const cloneResponse = <T>(
  snapshot: CachedResponseSnapshot,
  config: AxiosRequestConfig,
): AxiosResponse<T> => ({
  data: snapshot.data as T,
  status: snapshot.status,
  statusText: snapshot.statusText,
  headers: snapshot.headers,
  config: {
    ...config,
    headers: config.headers || {},
  } as AxiosResponse<T>['config'],
  request: undefined,
});

const resolveCacheKey = (
  url: string,
  config: AxiosRequestConfig,
  options: CachedGetOptions,
) => {
  if (options.cacheKey) return options.cacheKey;
  return `${config.baseURL || ''}|${url}|${stableSerialize(config.params || {})}`;
};

const executeNetworkGet = async <T>(
  url: string,
  config: AxiosRequestConfig,
  key: string,
  ttlMs: number,
  useInflightCache: boolean,
): Promise<AxiosResponse<T>> => {
  if (useInflightCache) {
    const pending = inflightRequests.get(key);
    if (pending) {
      return pending.then((response) => response as AxiosResponse<T>);
    }
  }

  const requestPromise = api.get<T>(url, config) as Promise<AxiosResponse<T>>;
  if (useInflightCache) {
    inflightRequests.set(key, requestPromise as Promise<AxiosResponse<unknown>>);
  }

  try {
    const response = await requestPromise;
    responseCache.set(key, {
      expiresAt: Date.now() + ttlMs,
      snapshot: {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      },
    });
    startEvictionIfNeeded();
    return response;
  } finally {
    if (useInflightCache) {
      inflightRequests.delete(key);
    }
  }
};

export const cachedGet = async <T>(
  url: string,
  config: AxiosRequestConfig = {},
  options: CachedGetOptions = {},
): Promise<AxiosResponse<T>> => {
  if (options.skipCache) {
    return api.get<T>(url, config);
  }

  const ttlMs = Number.isFinite(options.ttlMs) ? Math.max(0, options.ttlMs ?? 0) : DEFAULT_TTL_MS;
  const key = resolveCacheKey(url, config, options);
  const now = Date.now();
  const cached = responseCache.get(key);
  const hasFreshCache = Boolean(cached && cached.expiresAt > now);

  if (hasFreshCache && cached) {
    return cloneResponse<T>(cached.snapshot, config);
  }

  const canShareInflight = !config.signal;
  if (cached && options.staleWhileRevalidate) {
    if (!inflightRequests.has(key)) {
      void executeNetworkGet<T>(url, config, key, ttlMs, canShareInflight).catch(() => undefined);
    }
    return cloneResponse<T>(cached.snapshot, config);
  }

  try {
    return await executeNetworkGet<T>(url, config, key, ttlMs, canShareInflight);
  } catch (error) {
    if (cached && options.staleWhileRevalidate) {
      return cloneResponse<T>(cached.snapshot, config);
    }
    throw error;
  }
};

export const invalidateCachedGet = (
  matcher?: string | RegExp | ((key: string) => boolean),
) => {
  if (!matcher) {
    responseCache.clear();
    inflightRequests.clear();
    return;
  }

  const shouldDelete = (key: string) => {
    if (typeof matcher === 'string') return key.includes(matcher);
    if (matcher instanceof RegExp) return matcher.test(key);
    return matcher(key);
  };

  Array.from(responseCache.keys()).forEach((key) => {
    if (shouldDelete(key)) responseCache.delete(key);
  });
  Array.from(inflightRequests.keys()).forEach((key) => {
    if (shouldDelete(key)) inflightRequests.delete(key);
  });
};
