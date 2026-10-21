import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { makeStyles } from '@/hooks/useTheme';

const TICK_MS = 30_000;

// The daily card allowance resets at midnight UTC (see todayKey in
// functions/src/index.ts).
function msUntilReset(): number {
  const now = Date.now();
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return next.getTime() - now;
}

function formatWait(ms: number): string {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

// "5h 12m" until fresh cards, or null once they're ready. Ticks while
// mounted so the page stays current if it's left open.
export function useFreshCardsCountdown(): string | null {
  // Fixed when the page opens, so the countdown ends rather than rolling
  // on to the following midnight.
  const [resetAt] = useState(() => Date.now() + msUntilReset());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const remaining = resetAt - now;
  return remaining > 0 ? formatWait(remaining) : null;
}

interface DoneForTodayProps {
  onCheckAgain: () => void;
  onViewProfile: () => void;
}

// Shown when today's cards are used up. A deliberate stop: Pique is a few
// sessions a day, not an endless feed.
export function DoneForToday({ onCheckAgain, onViewProfile }: DoneForTodayProps) {
  const styles = useStyles();
  const wait = useFreshCardsCountdown();

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.top}>
        <Text style={styles.emoji} accessibilityElementsHidden>
          🌙
        </Text>
        <Text style={styles.heading} accessibilityRole="header">
          That’s today’s thinking done
        </Text>
        <Text style={styles.subheading}>
          You’ve worked through all of today’s cards. Go do something offline.
        </Text>
      </View>

      <View style={styles.countdown} accessibilityLiveRegion="polite">
        {wait ? (
          <>
            <Text style={styles.countdownLabel}>FRESH CARDS IN</Text>
            <Text style={styles.countdownValue}>{wait}</Text>
          </>
        ) : (
          <Text style={styles.countdownValue}>Fresh cards are ready</Text>
        )}
      </View>

      <View style={styles.frankBox}>
        <Text style={styles.frankLabel}>FROM FRANK</Text>
        <Text style={styles.frankMessage}>
          I’m already working on tomorrow’s batch. Come back to keep your streak going.
        </Text>
      </View>

      <View style={styles.actions}>
        {!wait && <Button title="Get today’s cards" variant="accent" onPress={onCheckAgain} />}
        <Pressable style={styles.link} onPress={onViewProfile} accessibilityRole="link">
          <Text style={styles.linkText}>View profile</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const MIN_TOUCH_TARGET = 44;

// Always dark, so the colours are fixed; only the text size follows the theme.
const useStyles = makeStyles(() => ({
  root: {
    flex: 1,
    backgroundColor: Colors.navy,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Theme.spacing.lg,
    gap: Theme.spacing.lg,
  },
  top: {
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  emoji: {
    fontSize: Theme.fontSize.xxl + Theme.fontSize.sm - 1, // 48
  },
  heading: {
    color: Colors.white,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.xl,
    textAlign: 'center',
  },
  subheading: {
    color: Colors.lavenderGrey,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.md,
    lineHeight: 24,
    textAlign: 'center',
  },
  countdown: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.md,
    paddingVertical: Theme.spacing.md,
    gap: Theme.spacing.xs,
  },
  countdownLabel: {
    color: Colors.midGrey,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.xs,
    letterSpacing: 2,
  },
  countdownValue: {
    color: Colors.navy,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.xl,
  },
  frankBox: {
    backgroundColor: Colors.darkPurple,
    borderLeftColor: Colors.amber,
    borderLeftWidth: 3,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    gap: Theme.spacing.xs,
  },
  frankLabel: {
    color: Colors.amber,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.xs,
    letterSpacing: 2,
  },
  frankMessage: {
    color: Colors.lavenderGrey,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.md,
    lineHeight: 24,
  },
  actions: {
    gap: Theme.spacing.xs,
  },
  link: {
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    color: Colors.violet,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.md,
  },
}));
