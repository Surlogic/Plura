export const getCategoryAccent = (value: string) => {
  const normalized = value.toLowerCase();

  if (normalized.includes('pelu')) {
    return {
      icon: 'sparkles-outline' as const,
      colors: ['#0EA5A4', '#155E75'] as const,
    };
  }
  if (normalized.includes('barb')) {
    return {
      icon: 'flame-outline' as const,
      colors: ['#334155', '#0F172A'] as const,
    };
  }
  if (normalized.includes('u') || normalized.includes('mani')) {
    return {
      icon: 'color-palette-outline' as const,
      colors: ['#EC4899', '#BE185D'] as const,
    };
  }
  if (normalized.includes('spa')) {
    return {
      icon: 'leaf-outline' as const,
      colors: ['#14B8A6', '#0F766E'] as const,
    };
  }
  if (normalized.includes('cosme') || normalized.includes('facial')) {
    return {
      icon: 'flower-outline' as const,
      colors: ['#F59E0B', '#B45309'] as const,
    };
  }

  return {
    icon: 'briefcase-outline' as const,
    colors: ['#1F3C88', '#0E2A47'] as const,
  };
};
