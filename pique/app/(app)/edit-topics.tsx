import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { collection, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { InterestChip } from '@/components/ui/InterestChip';
import { Theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { makeStyles, useTheme } from '@/hooks/useTheme';
import { db } from '@/lib/firebase';
import { INTERESTS, seedInterests } from '@/lib/seedInterests';
import { MIN_TOPICS, saveTopics, SESSIONS_TO_CHANGE_TOPICS } from '@/lib/topics';

const MIN_TOUCH_TARGET = 44;

// Changing topics after onboarding. Opened from Settings once the user has
// finished enough sessions; the rules enforce the same limit.
export default function EditTopicsScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { user, piqueUser } = useAuth();
  const [saved, setSaved] = useState<ReadonlySet<string> | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unlocked = (piqueUser?.sessionsCompleted ?? 0) >= SESSIONS_TO_CHANGE_TOPICS;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  };

  useEffect(() => {
    // Topics added since the user onboarded (such as Sport) may not exist yet.
    seedInterests().catch((e: unknown) => console.warn('Failed to seed interests', e));
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getDocs(collection(db, 'users', user.uid, 'interests'))
      .then((snapshot) => {
        if (cancelled) return;
        const ids = new Set(snapshot.docs.map((d) => d.id));
        setSaved(ids);
        setSelected(ids);
      })
      .catch((e: unknown) => {
        console.warn('Failed to load topics', e);
        if (!cancelled) setError('We couldn’t load your topics. Check your connection and try again.');
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const changed =
    saved !== null &&
    (saved.size !== selected.size || [...selected].some((id) => !saved.has(id)));
  const canSave = unlocked && changed && selected.size >= MIN_TOPICS;

  const handleSave = async () => {
    if (!canSave || !user || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await saveTopics(user.uid, selected);
      goBack();
    } catch (e) {
      console.warn('Failed to save topics', e);
      setError('We couldn’t save your topics. Check your connection and try again.');
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          Your topics
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Topics you keep hold on to what Frank has learned about you. New ones start fresh.
          Pick at least {MIN_TOPICS}.
        </Text>

        <View style={styles.grid}>
          {INTERESTS.map((interest) => (
            <InterestChip
              key={interest.id}
              interest={interest}
              selected={selected.has(interest.id)}
              onToggle={toggle}
            />
          ))}
        </View>

        <Text
          style={[styles.counter, selected.size >= MIN_TOPICS && styles.counterMet]}
          accessibilityLiveRegion="polite"
        >
          {selected.size} of {MIN_TOPICS} minimum selected
        </Text>

        <ErrorMessage message={error} />

        <Button
          title="Save topics"
          onPress={handleSave}
          disabled={!canSave}
          loading={submitting}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((c) => ({
  safeArea: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
  },
  backButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: c.text,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.lg,
  },
  content: {
    padding: Theme.spacing.lg,
    gap: Theme.spacing.lg,
  },
  intro: {
    color: c.textSecondary,
    fontFamily: Theme.fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Theme.spacing.sm + Theme.spacing.xs,
  },
  counter: {
    color: c.textSecondary,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.sm,
    textAlign: 'center',
  },
  counterMet: {
    color: c.accentText,
  },
}));
