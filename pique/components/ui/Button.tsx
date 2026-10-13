import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';

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
  const isDisabled = disabled || loading;
  const outline = variant === 'outline';
  const accent = variant === 'accent';

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
        <ActivityIndicator color={outline || accent ? Colors.navy : Colors.white} />
      ) : (
        <Text style={[styles.title, (outline || accent) && styles.darkTitle]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.navy,
    borderRadius: Theme.borderRadius.md,
    paddingVertical: Theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Theme.spacing.xxl + Theme.spacing.sm,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: Colors.navy,
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
  darkTitle: {
    color: Colors.navy,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    backgroundColor: Colors.midGrey,
  },
  loading: {
    opacity: 0.8,
  },
  title: {
    color: Colors.white,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.md,
  },
});
