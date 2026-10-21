import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useFreshCardsCountdown } from '@/components/feed/DoneForToday';
import { Button } from '@/components/ui/Button';
import { LevelProgress } from '@/components/ui/LevelProgress';
import { Colors, darkColors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import type { SessionAnswer } from '@/hooks/useCards';
import { useSessionVerdict } from '@/hooks/useSessionVerdict';
import { makeStyles } from '@/hooks/useTheme';
import { levelFor } from '@/lib/levels';

interface SessionCompleteProps {
  cardsCompleted: number;
  topicsExplored: number;
  bestStreak: number;
  // This session's answers, scored live for Frank's verdict.
  answers: SessionAnswer[];
  // The user's points total, including this session once it's scored.
  points: number;
  // False after the last session of the day: no new session is offered.
  moreToday: boolean;
  onStartNewSession: () => void;
  onViewProfile: () => void;
}

// The points total updates just after the last score lands; waiting this
// long before comparing levels avoids announcing a level-up by mistake.
const SETTLE_MS = 1500;

function scoreBand(score: number): 'high' | 'mid' | 'low' {
  if (score >= 7) return 'high';
  if (score >= 4) return 'mid';
  return 'low';
}

export function SessionComplete({
  cardsCompleted,
  topicsExplored,
  bestStreak,
  answers,
  points,
  moreToday,
  onStartNewSession,
  onViewProfile,
}: SessionCompleteProps) {
  const styles = useStyles();
  const wait = useFreshCardsCountdown();
  const verdict = useSessionVerdict(answers);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!verdict.allScored) return;
    const timer = setTimeout(() => setSettled(true), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [verdict.allScored]);

  const levelBefore = levelFor(Math.max(0, points - verdict.sessionPoints));
  const levelNow = levelFor(points);
  const leveledUp = settled && levelNow.number > levelBefore.number;

  const stats = [
    { label: cardsCompleted === 1 ? 'card' : 'cards', value: cardsCompleted },
    { label: topicsExplored === 1 ? 'topic' : 'topics', value: topicsExplored },
    { label: 'best streak', value: bestStreak },
  ];

  const renderVerdict = () => {
    if (answers.length === 0) {
      return <Text style={styles.verdictNote}>No answers this time, so nothing to score.</Text>;
    }
    if (!verdict.allScored && !verdict.timedOut) {
      return (
        <View style={styles.scoring} accessibilityLiveRegion="polite">
          <ActivityIndicator color={Colors.violet} />
          <Text style={styles.verdictNote}>
            Frank is scoring your answers… {verdict.scored.length} of {answers.length}
          </Text>
        </View>
      );
    }
    return (
      <>
        <Text style={styles.sessionPoints} accessibilityLiveRegion="polite">
          +{verdict.sessionPoints} points
        </Text>
        <View style={styles.chips} accessibilityLabel={`Scores: ${verdict.scored.map((a) => a.score).join(', ')} out of 10`}>
          {verdict.scored.map((answer, index) => (
            <View key={index} style={[styles.chip, styles[`chip_${scoreBand(answer.score)}`]]}>
              <Text style={[styles.chipText, styles[`chipText_${scoreBand(answer.score)}`]]}>
                {answer.score}
              </Text>
            </View>
          ))}
        </View>
        {verdict.best && (
          <View style={styles.best}>
            <Text style={styles.bestLabel}>YOUR BEST TAKE · {verdict.best.score}/10</Text>
            <Text style={styles.bestPrompt} numberOfLines={2}>
              {verdict.best.card.prompt}
            </Text>
            {verdict.best.take && <Text style={styles.bestTake}>“{verdict.best.take}”</Text>}
          </View>
        )}
        {!verdict.allScored && (
          <Text style={styles.verdictNote}>
            Frank’s still scoring the rest. They’ll count towards your level.
          </Text>
        )}
      </>
    );
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.top}>
        <Text style={styles.emoji} accessibilityElementsHidden>
          🎉
        </Text>
        <Text style={styles.heading} accessibilityRole="header">
          Session complete
        </Text>
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
        <Text style={styles.frankLabel}>FRANK’S VERDICT</Text>
        {renderVerdict()}
      </View>

      <View style={styles.levelBox}>
        {leveledUp && (
          <Text style={styles.levelUp} accessibilityRole="alert">
            ⬆ Level up! You’ve reached {levelNow.name}.
          </Text>
        )}
        <LevelProgress points={points} onDark />
      </View>

      {!moreToday && (
        <Text style={styles.lastSession}>
          That was your last session for today. Come back tomorrow to keep your streak going.
        </Text>
      )}

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
const CHIP_SIZE = 32;

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
    gap: Theme.spacing.sm,
  },
  frankLabel: {
    color: darkColors.accentText,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.xs,
    letterSpacing: 2,
  },
  scoring: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  verdictNote: {
    flexShrink: 1,
    color: Colors.lavenderGrey,
    fontFamily: Theme.fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  // Amber, like the streak: it's the reward.
  sessionPoints: {
    color: Colors.amber,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.xl,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.xs + Theme.spacing.xs / 2, // 6
  },
  chip: {
    minWidth: CHIP_SIZE,
    height: CHIP_SIZE,
    paddingHorizontal: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip_high: {
    backgroundColor: Colors.violet,
  },
  chip_mid: {
    backgroundColor: darkColors.accentSoft,
  },
  chip_low: {
    backgroundColor: darkColors.border,
  },
  chipText: {
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: 14,
  },
  chipText_high: {
    color: Colors.white,
  },
  chipText_mid: {
    color: Colors.white,
  },
  chipText_low: {
    color: Colors.lavenderGrey,
  },
  best: {
    gap: Theme.spacing.xs,
    paddingTop: Theme.spacing.xs,
  },
  bestLabel: {
    color: Colors.amber,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.xs,
    letterSpacing: 1,
  },
  bestPrompt: {
    color: Colors.white,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: 15,
    lineHeight: 22,
  },
  bestTake: {
    color: Colors.lavenderGrey,
    fontFamily: Theme.fontFamily.regular,
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  levelBox: {
    gap: Theme.spacing.sm,
  },
  levelUp: {
    color: Colors.amber,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.md,
  },
  lastSession: {
    color: Colors.lavenderGrey,
    fontFamily: Theme.fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
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
    color: darkColors.accentText,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.md,
  },
}));
