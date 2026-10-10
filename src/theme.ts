import { useColorScheme } from 'react-native';

/* Couleurs système Apple (iOS) */
export const light = {
  bg: '#F2F2F7', // systemGroupedBackground
  surface: '#FFFFFF', // secondarySystemGroupedBackground
  sunk: '#EEEEF0', // tertiary fill
  ink: '#000000',
  muted: '#8A8A8E', // secondaryLabel
  line: '#D8D8DC', // separator
  accent: '#007AFF', // systemBlue
  accentInk: '#FFFFFF',
  accentSoft: '#E5F0FF',
  good: '#248A3D', // systemGreen (texte lisible)
  goodSoft: '#E4F6E8',
  bad: '#FF3B30',
  badSoft: '#FFE9E7',
  // Couleurs des disques olympiques
  p25: '#C8102E',
  p20: '#1F49C7',
  p15: '#E0A800',
  p10: '#1D7445',
  p5: '#F4F4F2',
  p2: '#2A2D30',
  p1: '#8C9296',
};

export const dark: typeof light = {
  bg: '#000000',
  surface: '#1C1C1E',
  sunk: '#2C2C2E',
  ink: '#FFFFFF',
  muted: '#8E8E93',
  line: '#38383A',
  accent: '#0A84FF',
  accentInk: '#FFFFFF',
  accentSoft: '#0B2A4A',
  good: '#30D158',
  goodSoft: '#0F2E19',
  bad: '#FF453A',
  badSoft: '#3A1513',
  p25: '#C8102E',
  p20: '#1F49C7',
  p15: '#E0A800',
  p10: '#1D7445',
  p5: '#D9DAD6',
  p2: '#55595D',
  p1: '#8C9296',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
