import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Theme } from '@/constants/theme';
import type { BadgeStatus } from '@/hooks/useBadges';
import { makeStyles } from '@/hooks/useTheme';

const BADGE_SIZE = 56;

// Every badge, earned ones in full colour and locked ones faded. Tapping
// one says what it's for.
export function BadgeGrid({ badges }: { badges: BadgeStatus[] }) {
  const styles = useStyles();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = badges.find((badge) => badge.id === selectedId);
  const earnedCount = badges.filter((badge) => badge.isEarned).length;

  return (
    <View style={styles.container}>
      <Text style={styles.count}>
        {earnedCount} of {badges.length} earned
      </Text>
      <View style={styles.grid}>
        {badges.map((badge) => {
          const isSelected = badge.id === selectedId;
          return (
            <Pressable
              key={badge.id}
              style={styles.cell}
              onPress={() => setSelectedId(isSelected ? null : badge.id)}
              accessibilityRole="button"
              accessibilityLabel={`${badge.name}, ${badge.isEarned ? 'earned' : 'locked'}. ${badge.howToEarn}`}
              accessibilityState={{ selected: isSelected }}
            >
              <View
                style={[
                  styles.circle,
                  badge.isEarned ? styles.circleEarned : styles.circleLocked,
                  isSelected && styles.circleSelected,
                ]}
              >
                <Text style={[styles.emoji, !badge.isEarned && styles.emojiLocked]}>
                  {badge.emoji}
                </Text>
              </View>
              <Text
                style={[styles.name, !badge.isEarned && styles.nameLocked]}
                numberOfLines={2}
              >
                {badge.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {selected && (
        <Text style={styles.detail} accessibilityLiveRegion="polite">
          {selected.isEarned ? 'Earned: ' : 'To earn: '}
          {selected.howToEarn}
        </Text>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  container: {
    backgroundColor: c.surface,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    gap: Theme.spacing.md,
  },
  count: {
    color: c.textSecondary,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: Theme.spacing.md,
  },
  // Four to a row.
  cell: {
    width: '25%',
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  circle: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: Theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  circleEarned: {
    backgroundColor: c.accentSoft,
  },
  circleLocked: {
    backgroundColor: c.background,
  },
  circleSelected: {
    borderColor: c.accent,
  },
  emoji: {
    fontSize: 26,
  },
  emojiLocked: {
    opacity: 0.3,
  },
  name: {
    color: c.text,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.xs,
    textAlign: 'center',
  },
  nameLocked: {
    color: c.textSecondary,
  },
  detail: {
    color: c.text,
    fontFamily: Theme.fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
  },
}));
