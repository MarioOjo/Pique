import { useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Theme } from '@/constants/theme';
import { makeStyles, useTheme } from '@/hooks/useTheme';

interface TextFieldProps extends TextInputProps {
  label: string;
  // Hides the text and adds an eye button that shows or hides it.
  password?: boolean;
}

const EYE_RIGHT = 14;
const EYE_PADDING = 10;
const EYE_ICON = 20;
// Padding takes the eye to 40×40; this brings the touch target to 44.
const EYE_HIT_SLOP = 2;

export function TextField({ label, password = false, ...inputProps }: TextFieldProps) {
  const styles = useStyles();
  const [showPassword, setShowPassword] = useState(false);
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          style={[styles.input, password && styles.inputWithEye]}
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel={label}
          {...inputProps}
          secureTextEntry={password ? !showPassword : inputProps.secureTextEntry}
        />
        {password && (
          <Pressable
            style={({ pressed }) => [styles.eye, pressed && styles.eyePressed]}
            onPress={() => setShowPassword((shown) => !shown)}
            hitSlop={EYE_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              // Shows the current state: slashed while hidden, open while visible.
              name={showPassword ? 'eye-outline' : 'eye-off-outline'}
              size={EYE_ICON}
              color={colors.accentText}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  container: {
    gap: Theme.spacing.xs,
  },
  label: {
    color: c.text,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.sm,
  },
  inputWrap: {
    position: 'relative',
  },
  input: {
    backgroundColor: c.surface,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md - Theme.spacing.xs,
    color: c.text,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.md,
  },
  // Keeps typed text clear of the eye button.
  inputWithEye: {
    paddingRight: EYE_RIGHT + EYE_PADDING * 2 + EYE_ICON,
  },
  eye: {
    position: 'absolute',
    right: EYE_RIGHT,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    padding: EYE_PADDING,
  },
  eyePressed: {
    opacity: 0.6,
  },
}));
