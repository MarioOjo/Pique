import { StyleSheet, View } from 'react-native';
import { Theme } from '@/constants/theme';
import { PiqueMark } from './PiqueMark';

interface LogoMarkProps {
  // 'small' is the 28px header mark.
  size?: 'default' | 'small';
}

// The Pique mark, laid out for auth and onboarding headers.
export function LogoMark({ size = 'default' }: LogoMarkProps) {
  const small = size === 'small';
  return (
    <View style={[styles.mark, small && styles.markSmall]}>
      <PiqueMark size={small ? SMALL_SIZE : SIZE} />
    </View>
  );
}

const SIZE = Theme.spacing.xxl + Theme.spacing.md;
const SMALL_SIZE = 28;

const styles = StyleSheet.create({
  mark: {
    alignSelf: 'center',
    marginBottom: Theme.spacing.md,
  },
  markSmall: {
    marginBottom: 0,
  },
});
