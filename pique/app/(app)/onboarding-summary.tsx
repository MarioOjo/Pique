import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { LogoMark } from '@/components/ui/LogoMark';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import {
  DEFAULT_FRANK_STYLE,
  DEFAULT_SESSION_SIZE,
  DEFAULT_WHY,
  FRANK_STYLES,
  WHY_OPTIONS,
} from '@/lib/onboarding';

// Last onboarding step: recaps the answers, then completes onboarding.
export default function OnboardingSummaryScreen() {
  const { user, piqueUser } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const whyHere = piqueUser?.whyHere ?? DEFAULT_WHY;
  const frankStyle = piqueUser?.frankStyle ?? DEFAULT_FRANK_STYLE;
  const sessionSize = piqueUser?.sessionSize ?? DEFAULT_SESSION_SIZE;
  const whyText = WHY_OPTIONS.find((option) => option.id === whyHere)?.summary;
  const styleText = FRANK_STYLES.find((style) => style.value === frankStyle)?.summary;

  const handleStart = async () => {
    if (!user || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      // The root layout sees onboardingComplete and moves on to the feed.
      await updateDoc(doc(db, 'users', user.uid), { onboardingComplete: true });
    } catch (e) {
      console.warn('Failed to complete onboarding', e);
      setError('Couldn’t start. Check your connection and try again.');
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LogoMark />

        <Text style={styles.heading} accessibilityRole="header">
          Here’s how Frank will work with you
        </Text>

        <View style={styles.card}>
          <SummaryRow emoji="🎯" text={`You’re here to ${whyText}.`} />
          <View style={styles.divider} />
          <SummaryRow emoji="🗣️" text={`Frank will ${styleText} on the big questions.`} />
          <View style={styles.divider} />
          <SummaryRow emoji="🃏" text={`Each session is ${sessionSize} cards.`} />
        </View>

        <ErrorMessage message={error} />

        <Button title="Let’s go" onPress={handleStart} loading={submitting} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryRow({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.emoji} accessibilityElementsHidden importantForAccessibility="no">
        {emoji}
      </Text>
      <Text style={styles.rowText}>{text}</Text>
    </View>
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
  heading: {
    color: Colors.navy,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.xl,
    textAlign: 'center',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderGrey,
    marginVertical: Theme.spacing.sm + Theme.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Theme.spacing.sm + Theme.spacing.xs,
  },
  emoji: {
    fontSize: Theme.fontSize.lg,
  },
  rowText: {
    flex: 1,
    color: Colors.navy,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.md,
    lineHeight: 22,
  },
});
