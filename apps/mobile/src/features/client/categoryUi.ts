import { theme } from '../../theme';

export const getCategoryAccent = (value: string) => {
  const normalized = value.toLowerCase();

  if (normalized.includes('pelu')) {
    return {
      icon: 'sparkles-outline' as const,
      colors: [theme.colors.primaryStrong, theme.colors.accentStrong] as const,
    };
  }
  if (normalized.includes('barb')) {
    return {
      icon: 'flame-outline' as const,
      colors: [theme.colors.secondarySoft, theme.colors.secondary] as const,
    };
  }
  if (normalized.includes('u') || normalized.includes('mani')) {
    return {
      icon: 'color-palette-outline' as const,
      colors: [theme.colors.premiumStrong, theme.colors.premium] as const,
    };
  }
  if (normalized.includes('spa')) {
    return {
      icon: 'leaf-outline' as const,
      colors: [theme.colors.primaryStrong, theme.colors.accentStrong] as const,
    };
  }
  if (normalized.includes('cosme') || normalized.includes('facial')) {
    return {
      icon: 'flower-outline' as const,
      colors: [theme.colors.accentStrong, theme.colors.premiumStrong] as const,
    };
  }

  return {
    icon: 'briefcase-outline' as const,
    colors: [theme.colors.secondary, theme.colors.accent] as const,
  };
};
