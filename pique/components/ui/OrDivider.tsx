import { Text, View } from 'react-native';
import { Theme } from '@/constants/theme';
import { makeStyles } from '@/hooks/useTheme';

// A thin line with "or" in the middle, between alternative actions.
export function OrDivider() {
  const styles = useStyles();
  return (
    <View
      style={styles.divider}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.line} />
      <Text style={styles.text}>or</Text>
      <View style={styles.line} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm + Theme.spacing.xs,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: c.border,
  },
  text: {
    color: c.textSecondary,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.sm,
  },
}));
