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
  primary: '#5B8AFF',
  primaryDark: '#0B1220',
  primarySoft: '#5B8AFF20',
  primaryMuted: '#5B8AFF40',
  accent: '#4CAF6E',
  warning: '#D9A84E',
  warningSoft: '#D9A84E18',
  error: '#CF7070',
  errorSoft: '#CF707018',
  background: '#090D14',
  surface: '#111827',
  surfaceElevated: '#1A2234',
  surfaceTertiary: '#243042',
  text: '#E8ECF1',
  textSecondary: '#8E96A3',
  textTertiary: '#5A6270',
  border: '#243042',
  inputBg: '#111827',
  cardBg: '#111827',
  tabBar: '#090D14',
  tabIconDefault: '#5A6270',
  tabIconSelected: '#5B8AFF',
  scoreGreen: '#4CAF6E',
  scoreYellow: '#D9A84E',
  scoreRed: '#CF7070',
  trackBackground: '#1A2234',
  successSoft: '#4CAF6E18',
};

export const lightColors: ThemeColors = {
  primary: '#2D5BFF',
  primaryDark: '#0B1220',
  primarySoft: '#2D5BFF20',
  primaryMuted: '#2D5BFF40',
  accent: '#2E8B57',
  warning: '#D08A1D',
  warningSoft: '#D08A1D18',
  error: '#B65C5C',
  errorSoft: '#B65C5C18',
  background: '#F6F7FB',
  surface: '#FFFFFF',
  surfaceElevated: '#F0F1F5',
  surfaceTertiary: '#E7EBF2',
  text: '#0B1220',
  textSecondary: '#5B667A',
  textTertiary: '#9CA3AF',
  border: '#E7EBF2',
  inputBg: '#FFFFFF',
  cardBg: '#FFFFFF',
  tabBar: '#FAFBFC',
  tabIconDefault: '#9CA3AF',
  tabIconSelected: '#2D5BFF',
  scoreGreen: '#2E8B57',
  scoreYellow: '#D08A1D',
  scoreRed: '#B65C5C',
  trackBackground: '#E5E7EB',
  successSoft: '#2E8B5718',
};

export function getThemeColors(isDark: boolean): ThemeColors {
  return isDark ? darkColors : lightColors;
}
