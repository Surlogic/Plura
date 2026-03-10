export const THEME_STORAGE_KEY = 'plura-theme-preference';

export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type ResolvedTheme = 'light' | 'dark';

export const isThemePreference = (value: unknown): value is ThemePreference =>
  typeof value === 'string' && THEME_PREFERENCES.includes(value as ThemePreference);

export const getThemeInitScript = () => `
  (function () {
    var storageKey = '${THEME_STORAGE_KEY}';
    var root = document.documentElement;
    var preference = 'system';

    try {
      var stored = window.localStorage.getItem(storageKey);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        preference = stored;
      }
    } catch (error) {
      preference = 'system';
    }

    var prefersDark = false;
    try {
      prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch (error) {
      prefersDark = false;
    }

    var resolved = preference === 'system'
      ? (prefersDark ? 'dark' : 'light')
      : preference;

    root.classList.toggle('dark', resolved === 'dark');
    root.dataset.themePreference = preference;
    root.dataset.theme = resolved;
    root.style.colorScheme = resolved;
  })();
`;
