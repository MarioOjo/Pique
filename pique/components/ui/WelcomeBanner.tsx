import { useEffect, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';

interface WelcomeBannerProps {
  message: string;
  durationMs?: number;
}

const FADE_MS = 250;

export function WelcomeBanner({ message, durationMs = 3000 }: WelcomeBannerProps) {
  const [opacity] = useState(() => new Animated.Value(0));
  const [dismissed, setDismissed] = useState(false);

  // Fades in, holds, fades out once on mount, then unmounts itself.
  useEffect(() => {
    const animation = Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: FADE_MS, useNativeDriver: true }),
      Animated.delay(durationMs),
      Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }),
    ]);
    animation.start(({ finished }) => {
      if (finished) setDismissed(true);
    });
    return () => animation.stop();
  }, [durationMs, opacity]);

  if (dismissed) return null;

  return (
    <Animated.View
      style={[styles.banner, { opacity }]}
      pointerEvents="none"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Animated.Text style={styles.text}>{message}</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: Theme.spacing.sm,
    left: Theme.spacing.lg,
    right: Theme.spacing.lg,
    zIndex: 1,
    backgroundColor: Colors.navy,
    borderRadius: Theme.borderRadius.md,
    paddingVertical: Theme.spacing.sm + Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.md,
  },
  text: {
    color: Colors.white,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.sm,
    textAlign: 'center',
  },
});
