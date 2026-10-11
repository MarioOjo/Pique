export const Colors = {
  navy: '#1C1040',
  violet: '#7B5CF0',
  amber: '#F0B429',
  lightGrey: '#F5F5F7',
  midGrey: '#8B92A5',
  borderGrey: '#E5E7EB',
  darkPurple: '#2D1B5A',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export type ColorKey = keyof typeof Colors;
