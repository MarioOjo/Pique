import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useStats } from '@/hooks/useStats';
import { useTopInterests } from '@/hooks/useTopInterests';
import { INTERESTS } from '@/lib/seedInterests';

const TOP_TOPIC_COUNT = 3;
// Interest weights are capped at this by scoreResponse.
const MAX_WEIGHT = 3.0;
const MIN_TOUCH_TARGET = 44;

function interestLabel(interestId: string): string {
  const interest = INTERESTS.find((item) => item.id === interestId);
  return interest ? `${interest.emoji}  ${interest.name}` : interestId;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, piqueUser } = useAuth();
  const { stats, loading: statsLoading } = useStats(user?.uid);
  const { interests, loading: interestsLoading } = useTopInterests(user?.uid, TOP_TOPIC_COUNT);

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
            <Ionicons name="settings-outline" size={22} color={Colors.navy} />
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
          <Text style={styles.sectionLabel}>Top topics</Text>
          {interestsLoading ? (
            <ActivityIndicator color={Colors.violet} />
          ) : interests.length === 0 ? (
            <Text style={styles.empty}>No topics yet.</Text>
          ) : (
            interests.map((interest) => {
              const percent = Math.min(100, (interest.weight / MAX_WEIGHT) * 100);
              return (
                <View
                  key={interest.interestId}
                  style={styles.topic}
                  accessibilityLabel={`${interestLabel(interest.interestId)}, weight ${interest.weight.toFixed(1)} of ${MAX_WEIGHT}`}
                >
                  <View style={styles.topicHeader}>
                    <Text style={styles.topicName}>{interestLabel(interest.interestId)}</Text>
                    <Text style={styles.topicWeight}>{interest.weight.toFixed(1)}</Text>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.lightGrey,
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
    color: Colors.navy,
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
    color: Colors.navy,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: 18,
  },
  email: {
    color: Colors.midGrey,
    fontFamily: Theme.fontFamily.regular,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
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
    color: Colors.navy,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.xl,
  },
  flame: {
    color: Colors.amber,
  },
  streakPrompt: {
    color: Colors.navy,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: 14,
    lineHeight: 20,
  },
  statLabel: {
    color: Colors.midGrey,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.sm,
  },
  section: {
    gap: Theme.spacing.md,
  },
  sectionLabel: {
    color: Colors.midGrey,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  empty: {
    color: Colors.midGrey,
    fontFamily: Theme.fontFamily.regular,
    fontSize: 14,
  },
  topic: {
    gap: Theme.spacing.xs + Theme.spacing.xs / 2,
  },
  topicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topicName: {
    color: Colors.navy,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: 14,
  },
  topicWeight: {
    color: Colors.midGrey,
    fontFamily: Theme.fontFamily.regular,
    fontSize: 12,
  },
  barTrack: {
    height: Theme.spacing.sm,
    backgroundColor: Colors.borderGrey,
    borderRadius: Theme.borderRadius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: Colors.violet,
    borderRadius: Theme.borderRadius.full,
  },
});
