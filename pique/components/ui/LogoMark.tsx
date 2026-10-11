import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';

interface LogoMarkProps {
  // 'small' is the 28px header mark.
  size?: 'default' | 'small';
}

// Placeholder until the real logo asset exists.
export function LogoMark({ size = 'default' }: LogoMarkProps) {
  const small = size === 'small';
  return (
    <View style={[styles.mark, small && styles.markSmall]} accessibilityLabel="Pique">
      <Text style={[styles.letter, small && styles.letterSmall]}>P</Text>
    </View>
  );
}

const SIZE = Theme.spacing.xxl + Theme.spacing.md;
const SMALL_SIZE = 28;

const styles = StyleSheet.create({
  mark: {
    width: SIZE,
    height: SIZE,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: Colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Theme.spacing.md,
  },
  markSmall: {
    width: SMALL_SIZE,
    height: SMALL_SIZE,
    borderRadius: Theme.borderRadius.sm,
    marginBottom: 0,
  },
  letter: {
    color: Colors.white,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.xl,
  },
  letterSmall: {
    fontSize: Theme.fontSize.md,
  },
});
