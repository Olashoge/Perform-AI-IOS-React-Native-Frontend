export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primarySoft: string;
  primaryMuted: string;
  accent: string;
  warning: string;
  warningSoft: string;
  error: string;
  errorSoft: string;
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceTertiary: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  inputBg: string;
  cardBg: string;
  tabBar: string;
  tabIconDefault: string;
  tabIconSelected: string;
  scoreGreen: string;
  scoreYellow: string;
  scoreRed: string;
  trackBackground: string;
  successSoft: string;
}

export const darkColors: ThemeColors = {
  primary: '#8EACC7',
  primaryDark: '#C5D6E5',
  primarySoft: '#8EACC720',
  primaryMuted: '#8EACC740',
  accent: '#5A9A6B',
  warning: '#C9A04A',
  warningSoft: '#C9A04A18',
  error: '#B86060',
  errorSoft: '#B8606020',
  background: '#0A0C10',
  surface: '#141618',
  surfaceElevated: '#1C1F24',
  surfaceTertiary: '#24282E',
  text: '#E8ECF1',
  textSecondary: '#8E96A3',
  textTertiary: '#5A6270',
  border: '#24282E',
  inputBg: '#141618',
  cardBg: '#141618',
  tabBar: '#0A0C10',
  tabIconDefault: '#5A6270',
  tabIconSelected: '#E8ECF1',
  scoreGreen: '#5A9A6B',
  scoreYellow: '#C9A04A',
  scoreRed: '#B86060',
  trackBackground: '#1C1F24',
  successSoft: '#5A9A6B18',
};

export const lightColors: ThemeColors = {
  primary: '#0B1F3A',
  primaryDark: '#060E1A',
  primarySoft: '#0B1F3A10',
  primaryMuted: '#0B1F3A20',
  accent: '#3F6B4E',
  warning: '#8A6A2F',
  warningSoft: '#8A6A2F14',
  error: '#8B3A3A',
  errorSoft: '#8B3A3A14',
  background: '#F6F7F9',
  surface: '#FFFFFF',
  surfaceElevated: '#F1F5F9',
  surfaceTertiary: '#E5E7EB',
  text: '#111827',
  textSecondary: '#4B5563',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  inputBg: '#FFFFFF',
  cardBg: '#FFFFFF',
  tabBar: '#FAFBFC',
  tabIconDefault: '#9CA3AF',
  tabIconSelected: '#111827',
  scoreGreen: '#3F6B4E',
  scoreYellow: '#8A6A2F',
  scoreRed: '#8B3A3A',
  trackBackground: '#E5E7EB',
  successSoft: '#3F6B4E14',
};

export function getThemeColors(isDark: boolean): ThemeColors {
  return isDark ? darkColors : lightColors;
}
