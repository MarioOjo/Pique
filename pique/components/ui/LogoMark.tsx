import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';

// Placeholder until the real logo asset exists.
export function LogoMark() {
  return (
    <View style={styles.mark} accessibilityLabel="Pique">
      <Text style={styles.letter}>P</Text>
    </View>
  );
}

const SIZE = Theme.spacing.xxl + Theme.spacing.md;

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
  letter: {
    color: Colors.white,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.xl,
  },
});
