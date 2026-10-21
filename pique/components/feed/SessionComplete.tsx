import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFreshCardsCountdown } from '@/components/feed/DoneForToday';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { makeStyles } from '@/hooks/useTheme';

interface SessionCompleteProps {
  cardsCompleted: number;
  topicsExplored: number;
  bestStreak: number;
  // False after the last session of the day: no new session is offered.
  moreToday: boolean;
  onStartNewSession: () => void;
  onViewProfile: () => void;
}

const FRANK_MESSAGES = [
  'Your feed will reflect what you engaged with today.',
  'The topics you spent time on will appear more often.',
  'Come back tomorrow to keep your streak.',
  'The more sessions you complete, the better Frank knows you.',
] as const;

// Mounted fresh each time a session ends, so Frank's message is picked
// once per completion and stays put while it's on screen.
export function SessionComplete({
  cardsCompleted,
  topicsExplored,
  bestStreak,
  moreToday,
  onStartNewSession,
  onViewProfile,
}: SessionCompleteProps) {
  const styles = useStyles();
  const [frankMessage] = useState(
    () => FRANK_MESSAGES[Math.floor(Math.random() * FRANK_MESSAGES.length)],
  );
  const wait = useFreshCardsCountdown();

  const stats = [
    { label: cardsCompleted === 1 ? 'card' : 'cards', value: cardsCompleted },
    { label: topicsExplored === 1 ? 'topic' : 'topics', value: topicsExplored },
    { label: 'best streak', value: bestStreak },
  ];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.top}>
        <Text style={styles.emoji} accessibilityElementsHidden>
          🎉
        </Text>
        <Text style={styles.heading} accessibilityRole="header">
          Session complete
        </Text>
        <Text style={styles.subheading}>Frank learned something today.</Text>
      </View>

      <View style={styles.statsRow}>
        {stats.map((stat) => (
          <View
            key={stat.label}
            style={styles.statCard}
            accessibilityLabel={`${stat.value} ${stat.label}`}
          >
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.frankBox}>
        <Text style={styles.frankLabel}>FROM FRANK</Text>
        <Text style={styles.frankMessage}>
          {moreToday ? frankMessage : 'That was your last session for today. Come back tomorrow to keep your streak going.'}
        </Text>
      </View>

      <View style={styles.actions}>
        {moreToday ? (
          <Button title="Start new session" variant="accent" onPress={onStartNewSession} />
        ) : (
          <Text style={styles.doneForToday} accessibilityLiveRegion="polite">
            {wait ? `🌙 Fresh cards in ${wait}` : 'Fresh cards are ready'}
          </Text>
        )}
        {!moreToday && !wait && (
          <Button title="Get today’s cards" variant="accent" onPress={onStartNewSession} />
        )}
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
  },
  subheading: {
    color: Colors.violet,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.md,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.sm,
    alignItems: 'center',
  },
  statValue: {
    color: Colors.navy,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.xl,
  },
  statLabel: {
    color: Colors.midGrey,
    fontFamily: Theme.fontFamily.regular,
    fontSize: 12,
    textAlign: 'center',
  },
  frankBox: {
    backgroundColor: Colors.darkPurple,
    borderLeftColor: Colors.violet,
    borderLeftWidth: 3,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    gap: Theme.spacing.xs,
  },
  frankLabel: {
    color: Colors.violet,
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
  doneForToday: {
    color: Colors.white,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.md,
    textAlign: 'center',
    paddingVertical: Theme.spacing.sm,
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
