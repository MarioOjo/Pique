import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/Button';
import { LogoMark } from '@/components/ui/LogoMark';
import { ProgressDots } from '@/components/ui/ProgressDots';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { ONBOARDING_STEPS } from '@/lib/onboarding';
import type { User } from '@/types';

type Answer = Partial<Pick<User, 'ageBand' | 'whyHere' | 'frankStyle' | 'sessionSize'>>;

// Saves one onboarding answer to the profile, then moves to the next screen.
export function useSaveAnswer() {
  const router = useRouter();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (answer: Answer, next: Href) => {
    if (!user || saving) return;
    setError(null);
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), answer);
      router.push(next);
    } catch (e) {
      console.warn('Failed to save onboarding answer', e);
      setError('Couldn’t save your answer. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return { save, saving, error };
}

interface QuestionScreenProps {
  step: number;
  eyebrow?: string;
  heading: string;
  subheading: string;
  children: ReactNode;
  footnote?: string;
  error: string | null;
  saving: boolean;
  canContinue: boolean;
  onContinue: () => void;
  // Optional: a quiet link that continues with a default answer.
  skipLabel?: string;
  onSkip?: () => void;
}

// Shared layout for the onboarding question screens.
export function QuestionScreen({
  step,
  eyebrow,
  heading,
  subheading,
  children,
  footnote,
  error,
  saving,
  canContinue,
  onContinue,
  skipLabel,
  onSkip,
}: QuestionScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LogoMark />
        <ProgressDots total={ONBOARDING_STEPS} current={step} />

        <View style={styles.header}>
          {eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
          <Text style={styles.heading} accessibilityRole="header">
            {heading}
          </Text>
          <Text style={styles.subheading}>{subheading}</Text>
        </View>

        <View accessibilityRole="radiogroup">{children}</View>

        {footnote && <Text style={styles.footnote}>{footnote}</Text>}
        {error && <Text style={styles.error}>{error}</Text>}

        <Button title="Continue" onPress={onContinue} disabled={!canContinue} loading={saving} />

        {skipLabel && onSkip && (
          <Pressable
            style={styles.skip}
            onPress={onSkip}
            disabled={saving}
            accessibilityRole="button"
          >
            <Text style={styles.skipText}>{skipLabel}</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface OptionCardProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  sub?: string;
  // An emoji or number shown before the label.
  leading?: string;
  centred?: boolean;
}

// One choice in a question's list.
export function OptionCard({ label, selected, onPress, sub, leading, centred }: OptionCardProps) {
  return (
    <Pressable
      style={[styles.option, centred && styles.optionCentred, selected && styles.optionSelected]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
      accessibilityState={{ selected }}
    >
      {leading !== undefined && (
        <Text style={[styles.leading, selected && styles.selectedText]}>{leading}</Text>
      )}
      <View style={[styles.optionBody, centred && styles.optionBodyCentred]}>
        <Text style={[styles.optionLabel, selected && styles.selectedText]}>{label}</Text>
        {sub && <Text style={styles.optionSub}>{sub}</Text>}
      </View>
    </Pressable>
  );
}

const MIN_TOUCH_TARGET = 44;

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
  eyebrow: {
    color: Colors.violet,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.sm,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
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
  footnote: {
    color: Colors.midGrey,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.sm,
    textAlign: 'center',
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
  skip: {
    alignSelf: 'center',
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.md,
  },
  skipText: {
    color: Colors.midGrey,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.sm,
  },
  option: {
    minHeight: MIN_TOUCH_TARGET + Theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm + Theme.spacing.xs,
    backgroundColor: Colors.white,
    borderColor: Colors.white,
    borderWidth: 2,
    borderRadius: Theme.borderRadius.md,
    paddingVertical: Theme.spacing.sm + Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.sm,
  },
  optionCentred: {
    justifyContent: 'center',
  },
  optionSelected: {
    borderColor: Colors.violet,
    backgroundColor: Colors.lightViolet,
  },
  leading: {
    minWidth: Theme.spacing.xl,
    color: Colors.midGrey,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.lg,
    textAlign: 'center',
  },
  optionBody: {
    flex: 1,
    gap: Theme.spacing.xs / 2,
  },
  optionBodyCentred: {
    flex: 0,
    alignItems: 'center',
  },
  optionLabel: {
    color: Colors.navy,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.md,
  },
  selectedText: {
    color: Colors.violet,
  },
  optionSub: {
    color: Colors.midGrey,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.sm,
  },
});
