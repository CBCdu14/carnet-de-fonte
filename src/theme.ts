import { useColorScheme } from 'react-native';

export const light = {
  bg: '#E8ECEA',
  surface: '#F8F9F8',
  sunk: '#DDE3E0',
  ink: '#15191B',
  muted: '#5A6468',
  line: '#C9D1CE',
  accent: '#1F49C7',
  accentInk: '#FFFFFF',
  accentSoft: '#DCE4FA',
  good: '#1D7445',
  goodSoft: '#DCEFE3',
  bad: '#B42318',
  badSoft: '#F8E1DE',
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
  bg: '#101315',
  surface: '#191D20',
  sunk: '#0B0D0F',
  ink: '#E7ECEA',
  muted: '#97A2A6',
  line: '#2B3236',
  accent: '#7B98FF',
  accentInk: '#0A0F1F',
  accentSoft: '#1D2648',
  good: '#5FCB8C',
  goodSoft: '#15291E',
  bad: '#FF8A7A',
  badSoft: '#35191A',
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
