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
  primary: '#8BA4C8',
  primaryDark: '#1C2433',
  primarySoft: '#2E3A59',
  primaryMuted: '#3A4666',
  accent: '#5E8C61',
  warning: '#C6A75E',
  warningSoft: '#2A2518',
  error: '#C05A5A',
  errorSoft: '#2A1818',
  background: '#0D1017',
  surface: '#161B24',
  surfaceElevated: '#1E2530',
  surfaceTertiary: '#2E3A59',
  text: '#E8ECF1',
  textSecondary: '#8E96A3',
  textTertiary: '#5A6270',
  border: '#2E3A4A',
  inputBg: '#161B24',
  cardBg: '#161B24',
  tabBar: '#0D1017',
  tabIconDefault: '#5A6270',
  tabIconSelected: '#8BA4C8',
  scoreGreen: '#5E8C61',
  scoreYellow: '#C6A75E',
  scoreRed: '#C05A5A',
  trackBackground: '#1E2530',
  successSoft: '#1A2A1B',
};

export const lightColors: ThemeColors = {
  primary: '#1C2433',
  primaryDark: '#111827',
  primarySoft: '#2E3A59',
  primaryMuted: '#3A4666',
  accent: '#5E8C61',
  warning: '#C6A75E',
  warningSoft: '#F3EBD8',
  error: '#C05A5A',
  errorSoft: '#F6E3E3',
  background: '#F7F8FA',
  surface: '#FFFFFF',
  surfaceElevated: '#F0F1F4',
  surfaceTertiary: '#E6E8EC',
  text: '#111318',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E6E8EC',
  inputBg: '#FFFFFF',
  cardBg: '#FFFFFF',
  tabBar: '#FAFBFC',
  tabIconDefault: '#9CA3AF',
  tabIconSelected: '#1C2433',
  scoreGreen: '#5E8C61',
  scoreYellow: '#C6A75E',
  scoreRed: '#C05A5A',
  trackBackground: '#E5E7EB',
  successSoft: '#E6F0E8',
};

export function getThemeColors(isDark: boolean): ThemeColors {
  return isDark ? darkColors : lightColors;
}
