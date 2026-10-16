import { Text } from 'react-native';
import { Theme } from '@/constants/theme';
import { makeStyles } from '@/hooks/useTheme';

// The one style for form and save errors on light screens. Announced to
// screen readers as soon as it appears.
export function ErrorMessage({ message }: { message: string | null }) {
  const styles = useStyles();
  if (!message) return null;
  return (
    <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
      {message}
    </Text>
  );
}

const useStyles = makeStyles((c) => ({
  error: {
    color: c.errorText,
    backgroundColor: c.errorBackground,
    borderColor: c.errorBorder,
    borderWidth: 1,
    borderRadius: Theme.borderRadius.sm,
    padding: Theme.spacing.sm + Theme.spacing.xs,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.sm,
  },
}));
