import { StyleSheet, Text } from 'react-native';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';

// The one style for form and save errors on light screens. Announced to
// screen readers as soon as it appears.
export function ErrorMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  error: {
    color: Colors.darkPurple,
    backgroundColor: Colors.white,
    borderColor: Colors.amber,
    borderWidth: 1,
    borderRadius: Theme.borderRadius.sm,
    padding: Theme.spacing.sm + Theme.spacing.xs,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.sm,
  },
});
