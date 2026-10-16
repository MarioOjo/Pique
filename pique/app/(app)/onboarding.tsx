import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { InterestChip } from '@/components/ui/InterestChip';
import { LogoMark } from '@/components/ui/LogoMark';
import { ProgressDots } from '@/components/ui/ProgressDots';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { ONBOARDING_STEPS, STEP } from '@/lib/onboarding';
import { INTERESTS, seedInterests } from '@/lib/seedInterests';
import type { UserInterest } from '@/types';

const MIN_SELECTED = 3;

export default function OnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [loadedSaved, setLoadedSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Chips render from the local list, so a failed seed doesn't block onboarding.
    seedInterests().catch((e: unknown) => console.warn('Failed to seed interests', e));
  }, []);

  // Coming back to this step (or resuming onboarding): start from the topics
  // already saved.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getDocs(collection(db, 'users', user.uid, 'interests'))
      .then((snapshot) => {
        if (cancelled || snapshot.empty) return;
        setSelected(new Set(snapshot.docs.map((d) => d.id)));
      })
      .catch((e: unknown) => console.warn('Failed to load saved topics', e))
      .finally(() => {
        if (!cancelled) setLoadedSaved(true);
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

  // Waits for saved topics to load so Continue never works from a stale list.
  const canContinue = loadedSaved && selected.size >= MIN_SELECTED;

  const handleContinue = async () => {
    if (!canContinue || !user || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      // Rules only allow creating a topic (at 1.0) or deleting it, so saved
      // topics that are still picked are left alone.
      const interests = collection(db, 'users', user.uid, 'interests');
      const saved = new Set((await getDocs(interests)).docs.map((d) => d.id));
      const batch = writeBatch(db);
      selected.forEach((interestId) => {
        if (saved.has(interestId)) return;
        const interest: UserInterest = { interestId, weight: 1.0 };
        batch.set(doc(interests, interestId), interest);
      });
      saved.forEach((interestId) => {
        if (!selected.has(interestId)) batch.delete(doc(interests, interestId));
      });
      await batch.commit();
      // Onboarding carries on with the profile questions; the summary step
      // sets onboardingComplete.
      router.push('/onboarding-why');
    } catch (e) {
      console.warn('Failed to save interests', e);
      setError('We couldn’t save your topics. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LogoMark />
        <ProgressDots total={ONBOARDING_STEPS} current={STEP.topics} />

        <View style={styles.header}>
          <Text style={styles.heading}>What do you want to think about?</Text>
          <Text style={styles.subheading}>
            Pick at least 3.
          </Text>
        </View>

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
          style={[styles.counter, canContinue && styles.counterMet]}
          accessibilityLiveRegion="polite"
        >
          {selected.size} of {MIN_SELECTED} minimum selected
        </Text>

        <ErrorMessage message={error} />

        <Button
          title="Continue"
          onPress={handleContinue}
          disabled={!canContinue}
          loading={submitting}
        />
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
    justifyContent: 'center',
    padding: Theme.spacing.lg,
    paddingTop: Theme.spacing.xxl,
    gap: Theme.spacing.lg,
  },
  header: {
    gap: Theme.spacing.sm,
  },
  heading: {
    color: Colors.navy,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.xl,
    textAlign: 'center',
  },
  subheading: {
    color: Colors.midGrey,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.md,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Theme.spacing.sm + Theme.spacing.xs,
  },
  counter: {
    color: Colors.midGrey,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.sm,
    textAlign: 'center',
  },
  counterMet: {
    color: Colors.violet,
  },
});
