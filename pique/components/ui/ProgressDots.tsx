import { StyleSheet, View } from 'react-native';
import { Theme } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface ProgressDotsProps {
  total: number;
  current: number;
  // Violet (the brand's progress colour) by default; pass amber on
  // always-dark screens.
  color?: string;
}

export function ProgressDots({ total, current, color }: ProgressDotsProps) {
  const { colors } = useTheme();
  const dotColor = color ?? colors.accent;
  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current} of ${total}`}
    >
      {Array.from({ length: total }, (_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            { borderColor: dotColor },
            index < current && { backgroundColor: dotColor },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
  },
  dot: {
    width: Theme.spacing.sm + Theme.spacing.xs / 2,
    height: Theme.spacing.sm + Theme.spacing.xs / 2,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1.5,
  },
});
