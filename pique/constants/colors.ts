export const Colors = {
  navy: '#1C1040',
  violet: '#7B5CF0',
  lightViolet: '#EDE9FE',
  amber: '#F0B429',
  lightGrey: '#F5F5F7',
  midGrey: '#8B92A5',
  borderGrey: '#E5E7EB',
  darkPurple: '#2D1B5A',
  // Body text on navy backgrounds.
  lavenderGrey: '#D4D0E8',
  white: '#FFFFFF',
  black: '#000000',
  scrim: 'rgba(0, 0, 0, 0.5)',
} as const;

export type ColorKey = keyof typeof Colors;
