import { ActivityIndicator, Pressable, Text } from 'react-native';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { makeStyles, useTheme } from '@/hooks/useTheme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  // 'outline': transparent with a navy border, for secondary actions.
  // 'accent': amber with navy text, for primary actions on navy screens.
  variant?: 'solid' | 'outline' | 'accent';
}

export function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'solid',
}: ButtonProps) {
  const styles = useStyles();
  const isDisabled = disabled || loading;
  const outline = variant === 'outline';
  const accent = variant === 'accent';
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        outline && styles.outline,
        accent && styles.accent,
        pressed && (outline ? styles.outlinePressed : styles.pressed),
        disabled && !loading && styles.disabled,
        loading && styles.loading,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={outline ? colors.text : accent ? Colors.navy : colors.onPrimary}
        />
      ) : (
        <Text
          style={[styles.title, outline && styles.outlineTitle, accent && styles.accentTitle]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  button: {
    backgroundColor: c.primary,
    borderRadius: Theme.borderRadius.md,
    paddingVertical: Theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Theme.spacing.xxl + Theme.spacing.sm,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: c.text,
    borderWidth: 1.5,
    borderRadius: Theme.borderRadius.lg,
    // Without padding, minHeight sets it to exactly 56 including the border.
    paddingVertical: 0,
  },
  // No fill to darken, so the press shows as a stronger fade.
  outlinePressed: {
    opacity: 0.6,
  },
  accent: {
    backgroundColor: Colors.amber,
  },
  outlineTitle: {
    color: c.text,
  },
  // Amber is the same in both modes, so its label stays navy.
  accentTitle: {
    color: Colors.navy,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    backgroundColor: c.disabled,
  },
  loading: {
    opacity: 0.8,
  },
  title: {
    color: c.onPrimary,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.md,
  },
}));
