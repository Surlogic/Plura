import * as SecureStore from 'expo-secure-store';

const safeParse = <T>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const getJsonItem = async <T>(key: string, fallback: T): Promise<T> => {
  try {
    const raw = await SecureStore.getItemAsync(key);
    const parsed = safeParse<T>(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

export const setJsonItem = async <T>(key: string, value: T): Promise<void> => {
  try {
    await SecureStore.setItemAsync(key, JSON.stringify(value));
  } catch {
    // Ignore persistent storage errors in UI-level preferences.
  }
};
