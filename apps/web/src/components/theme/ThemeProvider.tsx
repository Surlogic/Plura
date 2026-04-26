import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  THEME_STORAGE_KEY,
  isThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from '@/lib/theme';

type ThemeContextValue = {
  resolvedTheme: ResolvedTheme;
  themePreference: ThemePreference;
  setThemePreference: (value: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const resolveSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyThemeToDocument = (preference: ThemePreference): ResolvedTheme => {
  const resolved = preference === 'system' ? resolveSystemTheme() : preference;
  const root = document.documentElement;

  root.classList.toggle('dark', resolved === 'dark');
  root.dataset.themePreference = preference;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;

  return resolved;
};

const readInitialThemePreference = (): ThemePreference => {
  if (typeof document === 'undefined') return 'system';
  const datasetValue = document.documentElement.dataset.themePreference;
  return isThemePreference(datasetValue) ? datasetValue : 'system';
};

const readInitialResolvedTheme = (): ResolvedTheme => {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(
    readInitialThemePreference,
  );
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(
    readInitialResolvedTheme,
  );

  useEffect(() => {
    const resolved = applyThemeToDocument(themePreference);
    setResolvedTheme(resolved);

    try {
      if (themePreference === 'system') {
        window.localStorage.removeItem(THEME_STORAGE_KEY);
      } else {
        window.localStorage.setItem(THEME_STORAGE_KEY, themePreference);
      }
    } catch (error) {
      // Ignore storage write failures and keep the current session theme.
    }
  }, [themePreference]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemThemeChange = () => {
      if (themePreference !== 'system') return;
      const resolved = applyThemeToDocument('system');
      setResolvedTheme(resolved);
    };

    handleSystemThemeChange();

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [themePreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      resolvedTheme,
      themePreference,
      setThemePreference: setThemePreferenceState,
    }),
    [resolvedTheme, themePreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider.');
  }
  return context;
}
