export interface ThemeColors {
  primary: string;
  primaryDark: string;
  accent: string;
  warning: string;
  error: string;
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
}

export const darkColors: ThemeColors = {
  primary: '#0A84FF',
  primaryDark: '#0066CC',
  accent: '#30D158',
  warning: '#FF9F0A',
  error: '#FF453A',
  background: '#000000',
  surface: '#1C1C1E',
  surfaceElevated: '#2C2C2E',
  surfaceTertiary: '#3A3A3C',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  textTertiary: '#636366',
  border: '#38383A',
  inputBg: '#1C1C1E',
  cardBg: '#1C1C1E',
  tabBar: '#000000',
  tabIconDefault: '#636366',
  tabIconSelected: '#0A84FF',
  scoreGreen: '#30D158',
  scoreYellow: '#FF9F0A',
  scoreRed: '#FF453A',
};

export const lightColors: ThemeColors = {
  primary: '#007AFF',
  primaryDark: '#0056B3',
  accent: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceElevated: '#F2F2F7',
  surfaceTertiary: '#E5E5EA',
  text: '#000000',
  textSecondary: '#8E8E93',
  textTertiary: '#AEAEB2',
  border: '#C6C6C8',
  inputBg: '#FFFFFF',
  cardBg: '#FFFFFF',
  tabBar: '#F8F8F8',
  tabIconDefault: '#8E8E93',
  tabIconSelected: '#007AFF',
  scoreGreen: '#34C759',
  scoreYellow: '#FF9500',
  scoreRed: '#FF3B30',
};

export function getThemeColors(isDark: boolean): ThemeColors {
  return isDark ? darkColors : lightColors;
}
