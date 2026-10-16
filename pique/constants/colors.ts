export const Colors = {
  navy: '#1C1040',
  violet: '#7B5CF0',
  lightViolet: '#EDE9FE',
  amber: '#F0B429',
  lightGrey: '#F5F5F7',
  // Secondary text. Dark enough for 4.5:1 contrast on white, lightGrey and
  // lightViolet (WCAG AA for small text).
  midGrey: '#5F6678',
  borderGrey: '#E5E7EB',
  darkPurple: '#2D1B5A',
  // Body text on navy backgrounds.
  lavenderGrey: '#D4D0E8',
  white: '#FFFFFF',
  black: '#000000',
  scrim: 'rgba(0, 0, 0, 0.5)',
  // Destructive actions such as signing out.
  danger: '#DC2626',
  // Confirmation messages, such as a sent reset link.
  success: '#38A169',
  // Avatar preset backgrounds.
  avatarTeal: '#14B8A6',
  avatarCoral: '#F97362',
  avatarPurple: '#A855F7',
  avatarGreen: '#22C55E',
  avatarOrange: '#F97316',
  avatarGrey: '#6B7280',
} as const;

export type ColorKey = keyof typeof Colors;

// Colours by job, for screens that follow light or dark mode (see
// hooks/useTheme.tsx). The splash, Frank intro and end-of-session screens
// are always dark and use Colors directly.
// Every text colour here meets 4.5:1 (WCAG AA) on background, surface and
// accentSoft in its own mode.
export interface ThemeColors {
  background: string; // screen background
  surface: string; // cards, inputs, sheets
  border: string;
  text: string;
  textSecondary: string;
  accent: string; // violet fills: bars, selected borders, switches
  accentText: string; // violet text and icons
  accentSoft: string; // selected-option background
  primary: string; // solid buttons and selected choices
  onPrimary: string; // text on primary or accent
  disabled: string; // background of a disabled solid button
  header: string; // the feed's top bar
  onHeader: string;
  danger: string;
  success: string;
  errorBackground: string;
  errorText: string;
  errorBorder: string;
}

export const lightColors: ThemeColors = {
  background: Colors.lightGrey,
  surface: Colors.white,
  border: Colors.borderGrey,
  text: Colors.navy,
  textSecondary: Colors.midGrey,
  accent: Colors.violet,
  accentText: '#6A4BE0',
  accentSoft: Colors.lightViolet,
  primary: Colors.navy,
  onPrimary: Colors.white,
  disabled: Colors.midGrey,
  header: Colors.navy,
  onHeader: Colors.white,
  danger: Colors.danger,
  success: '#276749',
  errorBackground: Colors.white,
  errorText: Colors.darkPurple,
  errorBorder: Colors.amber,
};

export const darkColors: ThemeColors = {
  background: '#110B26',
  surface: '#1D1540',
  border: '#362C5E',
  text: '#F3F1FA',
  textSecondary: '#A7A1C2',
  accent: Colors.violet,
  accentText: '#A893F8',
  accentSoft: '#2D2263',
  // Navy would vanish on a navy background, so solid buttons go violet.
  primary: Colors.violet,
  onPrimary: Colors.white,
  disabled: '#4A4370',
  header: Colors.navy,
  onHeader: Colors.white,
  danger: '#F87171',
  success: '#4ADE80',
  errorBackground: '#1D1540',
  errorText: '#F3F1FA',
  errorBorder: Colors.amber,
};
