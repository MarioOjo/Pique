import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';

interface AccountCreatedProps {
  name?: string;
  onDone: () => void;
}

const ENTER_MS = 400;
const HOLD_MS = 1600; // how long the message stays before moving on
const EXIT_MS = 250;
// Screen reader users get longer, since the message is read aloud.
const SCREEN_READER_HOLD_MS = 4000;

// Confirms sign-up worked before the Frank intro starts. Moves on by itself,
// or straight away on tap.
export function AccountCreated({ name, onDone }: AccountCreatedProps) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    let cancelled = false;

    AccessibilityInfo.isScreenReaderEnabled().then((screenReader) => {
      if (cancelled) return;
      animation = Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: ENTER_MS,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        Animated.delay(screenReader ? SCREEN_READER_HOLD_MS : HOLD_MS),
        Animated.timing(progress, {
          toValue: 2,
          duration: EXIT_MS,
          useNativeDriver: true,
        }),
      ]);
      animation.start(({ finished }) => {
        if (finished) onDone();
      });
    });

    return () => {
      cancelled = true;
      animation?.stop();
    };
  }, [progress, onDone]);

  // 0 → 1 pops in, 1 → 2 fades out.
  const opacity = progress.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] });
  const iconScale = progress.interpolate({ inputRange: [0, 1, 2], outputRange: [0.6, 1, 1] });
  const firstName = name?.trim().split(/\s+/)[0];

  return (
    <Pressable
      style={styles.container}
      onPress={onDone}
      accessibilityRole="button"
      accessibilityHint="Continues to the introduction"
    >
      <Animated.View style={[styles.content, { opacity }]}>
        <Animated.View style={{ transform: [{ scale: iconScale }] }}>
          <Ionicons name="checkmark-circle" size={72} color={Colors.amber} />
        </Animated.View>
        <Text style={styles.heading} accessibilityRole="header" accessibilityLiveRegion="polite">
          Account created
        </Text>
        <Text style={styles.body}>
          {firstName ? `Welcome to Pique, ${firstName}.` : 'Welcome to Pique.'}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.lg,
  },
  content: {
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  heading: {
    color: Colors.white,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.xl,
    marginTop: Theme.spacing.md,
  },
  body: {
    color: Colors.lavenderGrey,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.md,
    textAlign: 'center',
  },
});
