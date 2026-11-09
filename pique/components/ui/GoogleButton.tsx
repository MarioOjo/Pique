import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Theme } from '@/constants/theme';
import { makeStyles, useTheme } from '@/hooks/useTheme';

// Google's sign-in button colours (developers.google.com/identity/branding-guidelines).
// They're Google's, not Pique's, so they sit outside the theme's colour roles.
const GOOGLE = {
  light: { background: '#FFFFFF', border: '#747775', text: '#1F1F1F' },
  dark: { background: '#131314', border: '#8E918F', text: '#E3E3E3' },
} as const;

const LOGO_SIZE = 20;

interface GoogleButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function GoogleButton({ onPress, loading = false, disabled = false }: GoogleButtonProps) {
  const styles = useStyles();
  const { scheme } = useTheme();
  const palette = GOOGLE[scheme === 'dark' ? 'dark' : 'light'];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.background, borderColor: palette.border },
        pressed && styles.pressed,
        disabled && !loading && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <View style={styles.content}>
          <GoogleLogo />
          <Text style={[styles.title, { color: palette.text }]}>Continue with Google</Text>
        </View>
      )}
    </Pressable>
  );
}

// Google's four-colour "G".
function GoogleLogo() {
  return (
    <Svg width={LOGO_SIZE} height={LOGO_SIZE} viewBox="0 0 48 48">
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}

const useStyles = makeStyles(() => ({
  // Same size and corners as the app's Button, so they line up.
  button: {
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    minHeight: Theme.spacing.xxl + Theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm + Theme.spacing.xs,
  },
  title: {
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.md,
  },
}));
