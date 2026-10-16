import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { Theme } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Interest } from '@/types';

interface InterestChipProps {
  interest: Interest;
  selected: boolean;
  onToggle: (id: string) => void;
}

const TRANSITION_MS = 180;

export function InterestChip({ interest, selected, onToggle }: InterestChipProps) {
  const { colors } = useTheme();
  const [progress] = useState(() => new Animated.Value(selected ? 1 : 0));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: selected ? 1 : 0,
      duration: TRANSITION_MS,
      // Colour interpolation isn't supported by the native driver.
      useNativeDriver: false,
    }).start();
  }, [selected, progress]);

  // Animated values have to be passed as style objects; the static parts
  // of the chip's styling live in the StyleSheet below.
  const animatedChip = {
    backgroundColor: progress.interpolate({
      inputRange: [0, 1],
      outputRange: [colors.surface, colors.accent],
    }),
    borderColor: progress.interpolate({
      inputRange: [0, 1],
      outputRange: [colors.border, colors.accent],
    }),
  };
  const animatedLabel = {
    color: progress.interpolate({
      inputRange: [0, 1],
      outputRange: [colors.text, colors.onPrimary],
    }),
  };

  return (
    <Pressable
      style={styles.pressable}
      onPress={() => onToggle(interest.id)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={interest.name}
    >
      <Animated.View style={[styles.chip, animatedChip]}>
        <Text style={styles.emoji}>{interest.emoji}</Text>
        <Animated.Text style={[styles.label, animatedLabel]} numberOfLines={1}>
          {interest.name}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: '48%',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    minHeight: 52,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm + Theme.spacing.xs,
    borderRadius: Theme.borderRadius.lg,
    // Border width stays constant so selecting doesn't shift layout; the
    // selected state blends the border into the violet fill.
    borderWidth: 1,
  },
  emoji: {
    fontSize: Theme.fontSize.lg,
  },
  label: {
    flexShrink: 1,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.md,
  },
});
