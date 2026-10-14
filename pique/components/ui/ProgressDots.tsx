import { StyleSheet, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';

interface ProgressDotsProps {
  total: number;
  current: number;
  // Navy by default; pass a light colour on dark screens.
  color?: string;
}

export function ProgressDots({ total, current, color = Colors.navy }: ProgressDotsProps) {
  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current} of ${total}`}
    >
      {Array.from({ length: total }, (_, index) => (
        <View
          key={index}
          style={[styles.dot, { borderColor: color }, index < current && { backgroundColor: color }]}
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
