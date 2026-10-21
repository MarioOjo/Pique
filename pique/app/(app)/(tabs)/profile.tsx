import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Avatar } from '@/components/ui/Avatar';
import { BadgeGrid } from '@/components/ui/BadgeGrid';
import { LevelProgress } from '@/components/ui/LevelProgress';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { makeStyles, useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useBadges } from '@/hooks/useBadges';
import { useStats } from '@/hooks/useStats';
import { useRecentTakes, type RecentTake } from '@/hooks/useRecentTakes';
import { useTopInterests } from '@/hooks/useTopInterests';
import { INTERESTS } from '@/lib/seedInterests';

const TOP_TOPIC_COUNT = 3;
const MIN_TOUCH_TARGET = 44;

function interestName(interestId: string): string {
  return INTERESTS.find((item) => item.id === interestId)?.name ?? interestId;
}

function takeAction(take: RecentTake): string {
  if (take.cardType === 'recall') return 'Wrote';
  return take.responseText === 'agree' ? 'Agreed' : 'Disagreed';
}

export default function ProfileScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { user, piqueUser } = useAuth();
  const { stats, loading: statsLoading } = useStats(user?.uid);
  const { badges } = useBadges(user?.uid, stats, statsLoading);
  const { interests, loading: interestsLoading } = useTopInterests(user?.uid, TOP_TOPIC_COUNT);
  const { takes, loading: takesLoading } = useRecentTakes(user?.uid);
  // Bars and percentages are relative to the strongest topic.
  const topWeight = interests[0]?.weight ?? 1;

  const name = piqueUser?.name?.trim() || 'Pique user';
  const email = piqueUser?.email ?? user?.email ?? '';

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.header} accessibilityRole="header">
            Profile
          </Text>
          <Pressable
            style={styles.iconButton}
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.identity}>
          <Avatar name={name} avatarId={piqueUser?.avatarId} />
          <View style={styles.identityText}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            {email !== '' && (
              <Text style={styles.email} numberOfLines={1}>
                {email}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.statsRow}>
          {!statsLoading && stats.currentStreak === 0 ? (
            <View style={styles.statCard}>
              <Text style={styles.flame}>🔥</Text>
              <Text style={styles.streakPrompt}>Start your first streak today</Text>
            </View>
          ) : (
            <View style={styles.statCard} accessibilityLabel={`${stats.currentStreak} day streak`}>
              <Text style={styles.statValue}>
                <Text style={styles.flame}>🔥 </Text>
                {statsLoading ? '–' : stats.currentStreak}
              </Text>
              <Text style={styles.statLabel}>day streak</Text>
            </View>
          )}
          <View
            style={styles.statCard}
            accessibilityLabel={`${stats.totalResponses} cards completed`}
          >
            <Text style={styles.statValue}>{statsLoading ? '–' : stats.totalResponses}</Text>
            <Text style={styles.statLabel}>cards completed</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Thinker level</Text>
          <View style={styles.levelCard}>
            {statsLoading ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <LevelProgress points={stats.points} />
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Badges</Text>
          {statsLoading ? <ActivityIndicator color={colors.accent} /> : <BadgeGrid badges={badges} />}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Top topics</Text>
          {interestsLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : interests.length === 0 ? (
            <Text style={styles.empty}>Your top topics will show here once you answer a few cards.</Text>
          ) : (
            interests.map((interest, index) => {
              const rank = index + 1;
              const percent = Math.round(Math.min(100, (interest.weight / topWeight) * 100));
              const strength = rank === 1 ? 'Strongest' : `${percent}%`;
              const name = interestName(interest.interestId);
              return (
                <View
                  key={interest.interestId}
                  style={styles.topic}
                  accessibilityLabel={`Number ${rank}, ${name}, ${strength}`}
                >
                  <View style={styles.topicHeader}>
                    <Text style={styles.topicRank}>{rank}</Text>
                    <Text style={styles.topicName} numberOfLines={1}>
                      {name}
                    </Text>
                    <Text style={styles.topicStrength}>{strength}</Text>
                  </View>
                  <View style={styles.barTrack}>
                    {/* Width depends on data, so it can't live in the StyleSheet. */}
                    <View style={[styles.barFill, { width: `${percent}%` }]} />
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Recent takes</Text>
          {takesLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : takes.length === 0 ? (
            <Text style={styles.empty}>Nothing yet. Answer your first card and your takes will show here.</Text>
          ) : (
            <View style={styles.takes}>
              {takes.map((take, index) => (
                <View key={take.id}>
                  {index > 0 && <View style={styles.takeDivider} />}
                  <View style={styles.take}>
                    <View style={styles.takeActionRow}>
                      {/* Marks written (recall) responses at a glance. */}
                      {take.cardType === 'recall' && <View style={styles.wroteDot} />}
                      <Text style={styles.takeAction}>
                        {takeAction(take)} · {interestName(take.interestId)}
                      </Text>
                    </View>
                    <Text style={styles.takeBody} numberOfLines={2} ellipsizeMode="tail">
                      {take.body}
                    </Text>
                    {take.frankTake && (
                      <Text style={styles.frankTake} numberOfLines={2} ellipsizeMode="tail">
                        <Text style={styles.frankTakeLabel}>Frank’s take: </Text>
                        {take.frankTake}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((c) => ({
  safeArea: {
    flex: 1,
    backgroundColor: c.background,
  },
  content: {
    flexGrow: 1,
    padding: Theme.spacing.lg,
    gap: Theme.spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // Keeps the title aligned with the content while the icon's 44pt
    // touch area extends into the padding.
    marginVertical: -Theme.spacing.sm,
    marginRight: -Theme.spacing.sm - Theme.spacing.xs,
  },
  iconButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    color: c.text,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.lg,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  identityText: {
    flex: 1,
    gap: Theme.spacing.xs / 2,
  },
  name: {
    color: c.text,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: 18,
  },
  email: {
    color: c.textSecondary,
    fontFamily: Theme.fontFamily.regular,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    gap: Theme.spacing.xs,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statValue: {
    color: c.text,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.xl,
  },
  flame: {
    color: Colors.amber,
  },
  streakPrompt: {
    color: c.text,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: 14,
    lineHeight: 20,
  },
  statLabel: {
    color: c.textSecondary,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.sm,
  },
  section: {
    gap: Theme.spacing.md,
  },
  levelCard: {
    backgroundColor: c.surface,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
  },
  sectionLabel: {
    color: c.textSecondary,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  empty: {
    color: c.textSecondary,
    fontFamily: Theme.fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  topic: {
    gap: Theme.spacing.sm,
  },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topicRank: {
    width: 20,
    color: c.textSecondary,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.sm,
  },
  topicName: {
    flex: 1,
    color: c.text,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: 15,
  },
  topicStrength: {
    color: c.textSecondary,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.sm,
  },
  barTrack: {
    height: Theme.spacing.xs,
    backgroundColor: c.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: c.accent,
    borderRadius: 2,
  },
  // One card for the whole list, with dividers between the takes.
  takes: {
    backgroundColor: c.surface,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.md,
  },
  take: {
    paddingVertical: Theme.spacing.sm + Theme.spacing.xs,
    gap: Theme.spacing.xs,
  },
  takeDivider: {
    height: 1,
    backgroundColor: c.border,
  },
  takeActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs + Theme.spacing.xs / 2, // 6
  },
  wroteDot: {
    width: Theme.spacing.sm,
    height: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Colors.amber,
  },
  takeAction: {
    color: c.accentText,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.sm,
  },
  frankTake: {
    color: c.textSecondary,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.sm,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  frankTakeLabel: {
    color: c.accentText,
    fontFamily: Theme.fontFamily.semiBold,
    fontStyle: 'normal',
  },
  takeBody: {
    color: c.text,
    fontFamily: Theme.fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
  },
}));
