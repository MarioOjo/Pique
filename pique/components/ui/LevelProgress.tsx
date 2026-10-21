import { Text, View } from 'react-native';
import { Colors, darkColors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { makeStyles } from '@/hooks/useTheme';
import { levelFor } from '@/lib/levels';

interface LevelProgressProps {
  points: number;
  // On the always-dark end-of-session screen rather than a themed one.
  onDark?: boolean;
}

// The user's Thinker level, with a bar towards the next one.
export function LevelProgress({ points, onDark = false }: LevelProgressProps) {
  const themed = useThemedStyles();
  const dark = useDarkStyles();
  const styles = onDark ? dark : themed;
  const level = levelFor(points);

  const summary = level.next
    ? `${level.next.pointsToGo} ${level.next.pointsToGo === 1 ? 'point' : 'points'} to ${level.next.name}`
    : 'Top level reached';

  return (
    <View
      style={styles.container}
      accessibilityLabel={`Level ${level.number}, ${level.name}. ${points} points. ${summary}.`}
    >
      <View style={styles.header}>
        <Text style={styles.level}>
          Level {level.number} · <Text style={styles.name}>{level.name}</Text>
        </Text>
        <Text style={styles.points}>{points} pts</Text>
      </View>
      <View style={styles.track}>
        {/* Width depends on data, so it can't live in the StyleSheet. */}
        <View style={[styles.fill, { width: `${Math.round(level.progress * 100)}%` }]} />
      </View>
      <Text style={styles.summary}>{summary}</Text>
    </View>
  );
}

const base = {
  container: { gap: Theme.spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Theme.spacing.sm,
  },
  level: { fontFamily: Theme.fontFamily.regular, fontSize: 14, flexShrink: 1 },
  name: { fontFamily: Theme.fontFamily.semiBold },
  points: { fontFamily: Theme.fontFamily.semiBold, fontSize: 14 },
  track: { height: 8, borderRadius: Theme.borderRadius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Theme.borderRadius.full },
  summary: { fontFamily: Theme.fontFamily.regular, fontSize: Theme.fontSize.sm },
} as const;

const useThemedStyles = makeStyles((c) => ({
  container: base.container,
  header: base.header,
  level: { ...base.level, color: c.text },
  name: { ...base.name, color: c.accentText },
  points: { ...base.points, color: c.text },
  track: { ...base.track, backgroundColor: c.border },
  fill: { ...base.fill, backgroundColor: c.accent },
  summary: { ...base.summary, color: c.textSecondary },
}));

// Fixed colours: the end-of-session screen is always navy.
const useDarkStyles = makeStyles(() => ({
  container: base.container,
  header: base.header,
  level: { ...base.level, color: Colors.white },
  // Lighter violet: plain violet is too faint on navy for small text.
  name: { ...base.name, color: darkColors.accentText },
  points: { ...base.points, color: Colors.amber },
  track: { ...base.track, backgroundColor: Colors.darkPurple },
  fill: { ...base.fill, backgroundColor: Colors.violet },
  summary: { ...base.summary, color: Colors.lavenderGrey },
}));
