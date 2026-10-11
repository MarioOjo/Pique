import { StyleSheet, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';

interface ProgressDotsProps {
  total: number;
  current: number;
}

export function ProgressDots({ total, current }: ProgressDotsProps) {
  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current} of ${total}`}
    >
      {Array.from({ length: total }, (_, index) => (
        <View key={index} style={[styles.dot, index < current && styles.filled]} />
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
    borderColor: Colors.navy,
  },
  filled: {
    backgroundColor: Colors.navy,
  },
});
