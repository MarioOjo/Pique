import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  // 'outline': transparent with a navy border, for secondary actions.
  variant?: 'solid' | 'outline';
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

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        outline && styles.outline,
        pressed && styles.pressed,
        disabled && !loading && styles.disabled,
        loading && styles.loading,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={outline ? Colors.navy : Colors.white} />
      ) : (
        <Text style={[styles.title, outline && styles.outlineTitle]}>{title}</Text>
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
  },
  outlineTitle: {
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
