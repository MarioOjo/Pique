import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, writeBatch } from 'firebase/firestore';
import { Button } from '@/components/ui/Button';
import { InterestChip } from '@/components/ui/InterestChip';
import { LogoMark } from '@/components/ui/LogoMark';
import { ProgressDots } from '@/components/ui/ProgressDots';
import { WelcomeBanner } from '@/components/ui/WelcomeBanner';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { INTERESTS, seedInterests } from '@/lib/seedInterests';
import type { UserInterest } from '@/types';

const MIN_SELECTED = 3;

export default function OnboardingScreen() {
  const { user, piqueUser } = useAuth();
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Chips render from the local list, so a failed seed doesn't block onboarding.
    seedInterests().catch((e: unknown) => console.warn('Failed to seed interests', e));
  }, []);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const canContinue = selected.size >= MIN_SELECTED;

  const handleContinue = async () => {
    if (!canContinue || !user || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const batch = writeBatch(db);
      selected.forEach((interestId) => {
        const interest: UserInterest = { interestId, weight: 1.0 };
        batch.set(doc(db, 'users', user.uid, 'interests', interestId), interest);
      });
      batch.update(doc(db, 'users', user.uid), { onboardingComplete: true });
      // The profile listener in useAuth sees onboardingComplete and the root
      // layout redirects to the feed, so no manual navigation here.
      await batch.commit();
    } catch (e) {
      console.warn('Failed to save interests', e);
      setError('We couldn’t save your topics. Check your connection and try again.');
      setSubmitting(false);
    }
  };

  const welcome = piqueUser?.name ? `Welcome to Pique, ${piqueUser.name}! 👋` : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Mounted once the profile name is known, since right after sign-up
          the profile doc can arrive a moment after this screen. */}
      {welcome && <WelcomeBanner message={welcome} />}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LogoMark />
        {/* Step 3 of 3: after the two intro pages. */}
        <ProgressDots total={3} current={3} />

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

        {error && <Text style={styles.error}>{error}</Text>}

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
  error: {
    color: Colors.darkPurple,
    backgroundColor: Colors.white,
    borderColor: Colors.amber,
    borderWidth: 1,
    borderRadius: Theme.borderRadius.sm,
    padding: Theme.spacing.sm + Theme.spacing.xs,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.sm,
  },
});
