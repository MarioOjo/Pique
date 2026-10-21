import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors, type ThemeColors } from '@/constants/colors';

export type AppearancePreference = 'system' | 'light' | 'dark';
export type Scheme = 'light' | 'dark';
export type TextSize = 'standard' | 'large' | 'larger';

const STORAGE_KEY = 'pique_appearance';
const TEXT_SIZE_KEY = 'pique_text_size';

// How much each text size enlarges font sizes and line heights.
const TEXT_SCALE: Record<TextSize, number> = {
  standard: 1,
  large: 1.15,
  larger: 1.3,
};

interface ThemeContextValue {
  scheme: Scheme;
  colors: ThemeColors;
  preference: AppearancePreference;
  setPreference: (preference: AppearancePreference) => void;
  textSize: TextSize;
  setTextSize: (textSize: TextSize) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isPreference(value: unknown): value is AppearancePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

function isTextSize(value: unknown): value is TextSize {
  return value === 'standard' || value === 'large' || value === 'larger';
}

// Light or dark mode and text size for the app. "System" follows the
// phone's setting; both choices are kept on this device.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<AppearancePreference>('system');
  const [textSize, setTextSizeState] = useState<TextSize>('standard');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (isPreference(stored)) setPreferenceState(stored);
      })
      .catch((e: unknown) => console.warn('Failed to load appearance', e));
    AsyncStorage.getItem(TEXT_SIZE_KEY)
      .then((stored) => {
        if (isTextSize(stored)) setTextSizeState(stored);
      })
      .catch((e: unknown) => console.warn('Failed to load text size', e));
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const scheme: Scheme =
      preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;
    return {
      scheme,
      colors: scheme === 'dark' ? darkColors : lightColors,
      preference,
      setPreference: (next) => {
        setPreferenceState(next);
        AsyncStorage.setItem(STORAGE_KEY, next).catch((e: unknown) =>
          console.warn('Failed to save appearance', e),
        );
      },
      textSize,
      setTextSize: (next) => {
        setTextSizeState(next);
        AsyncStorage.setItem(TEXT_SIZE_KEY, next).catch((e: unknown) =>
          console.warn('Failed to save text size', e),
        );
      },
    };
  }, [preference, systemScheme, textSize]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}

// Enlarges every font size and line height in a set of styles.
function scaleText<T extends StyleSheet.NamedStyles<T>>(styles: T, scale: number): T {
  if (scale === 1) return styles;
  const scaled: Record<string, unknown> = {};
  for (const [name, style] of Object.entries(styles) as [string, Record<string, unknown>][]) {
    const next = { ...style };
    for (const key of ['fontSize', 'lineHeight'] as const) {
      const value = next[key];
      if (typeof value === 'number') next[key] = Math.round(value * scale);
    }
    scaled[name] = next;
  }
  return scaled as T;
}

// Builds a style hook from a function of the theme's colours. Each mode and
// text size gets its own StyleSheet, created the first time it's used.
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (colors: ThemeColors) => T,
): () => T {
  const sheets = new Map<string, T>();
  return function useStyles() {
    const { scheme, textSize } = useTheme();
    const key = `${scheme}-${textSize}`;
    let sheet = sheets.get(key);
    if (!sheet) {
      const colors = scheme === 'dark' ? darkColors : lightColors;
      sheet = StyleSheet.create(scaleText(factory(colors), TEXT_SCALE[textSize]));
      sheets.set(key, sheet);
    }
    return sheet;
  };
}
