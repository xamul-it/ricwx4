import { useMemo } from 'react';
import { Appearance, StyleSheet } from 'react-native';

export const colors = {
  surface: '#060608',
  onSurface: '#F0F0F0',
  surfaceSecondary: '#121216',
  onSurfaceSecondary: '#E2E2E2',
  surfaceTertiary: '#1C1C22',
  onSurfaceTertiary: '#D4D4D4',
  surfaceInverse: '#F0F0F0',
  onSurfaceInverse: '#060608',
  muted: '#808088',
  brand: '#D4AF37',
  onBrand: '#0A0A0A',
  brandPrimary: '#D4AF37',
  onBrandPrimary: '#0A0A0A',
  brandSecondary: '#B5952F',
  onBrandSecondary: '#0A0A0A',
  brandTertiary: '#8C7322',
  onBrandTertiary: '#F0F0F0',
  success: '#2A4D3E',
  onSuccess: '#89D9B2',
  warning: '#5C4623',
  onWarning: '#E5BA73',
  error: '#5C2323',
  onError: '#E57373',
  info: '#233F5C',
  onInfo: '#73B1E5',
  border: '#2A2A30',
  borderStrong: '#4A4A52',
  divider: '#1A1A20',
  scrim: 'rgba(6,6,8,0.72)',
  glass: 'rgba(18,18,22,0.55)',
  accent: '#006FCF',
  accentDeep: '#00529A',
  onAccent: '#FFFFFF',
};
export type Colors = typeof colors;

export const defaultScheme = 'dark' as const;
export const themes = { dark: colors };

export const fonts = {
  display: 'Cormorant-SemiBold',
  displayMedium: 'Cormorant-Medium',
  displayItalic: 'Cormorant-Italic',
  text: 'DMSans-Regular',
  textMedium: 'DMSans-Medium',
  textBold: 'DMSans-Bold',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, '2xl': 32, '3xl': 48 };
export const radius = { sm: 6, md: 12, lg: 20, pill: 999 };

export function setColorScheme(scheme: 'light' | 'dark' | null) {
  Appearance.setColorScheme?.(scheme ?? 'unspecified');
}

export function useTheme() {
  return { scheme: defaultScheme, colors };
}

/** Crea un hook di stili a partire dalla palette (tema unico, scuro). */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (c: Colors) => T) {
  return function useStyles(): T {
    return useMemo(() => StyleSheet.create(factory(colors)), []);
  };
}

// L'app è sempre in tema scuro.
setColorScheme('dark');
