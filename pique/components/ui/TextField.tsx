import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';

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
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          style={[styles.input, password && styles.inputWithEye]}
          placeholderTextColor={Colors.midGrey}
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
              color={Colors.violet}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Theme.spacing.xs,
  },
  label: {
    color: Colors.navy,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.sm,
  },
  inputWrap: {
    position: 'relative',
  },
  input: {
    backgroundColor: Colors.white,
    borderColor: Colors.borderGrey,
    borderWidth: 1,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md - Theme.spacing.xs,
    color: Colors.navy,
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
});
