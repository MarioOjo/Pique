import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { doc, updateDoc } from 'firebase/firestore';
import { AccountCreated } from '@/components/onboarding/AccountCreated';
import { PiqueMark } from '@/components/ui/PiqueMark';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';

const HOW_IT_WORKS = [
  { icon: '🃏', text: 'You see a card — a question or idea worth thinking about' },
  { icon: '💬', text: 'You respond before moving on — that’s the only rule' },
  { icon: '🔁', text: 'Frank learns from every response and improves your feed' },
] as const;

const LOGO_FADE_MS = 600;

// Shown once, between registering and picking interests. Opens with a
// short "Account created" confirmation, then the intro itself.
export default function FrankIntroScreen() {
  const { user, piqueUser } = useAuth();
  const [showAccountCreated, setShowAccountCreated] = useState(true);
  const [logoOpacity] = useState(() => new Animated.Value(0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stable, so the confirmation's timer isn't restarted by re-renders.
  const finishAccountCreated = useCallback(() => setShowAccountCreated(false), []);

  useEffect(() => {
    if (showAccountCreated) return;
    Animated.timing(logoOpacity, {
      toValue: 1,
      duration: LOGO_FADE_MS,
      useNativeDriver: true,
    }).start();
  }, [showAccountCreated, logoOpacity]);

  const handleContinue = async () => {
    if (!user || saving) return;
    setSaving(true);
    setError(null);
    try {
      // The root layout sees frankIntroSeen and moves on to onboarding
      // with router.replace, so this screen can't be returned to.
      await updateDoc(doc(db, 'users', user.uid), { frankIntroSeen: true });
    } catch (e) {
      console.warn('Failed to save frankIntroSeen', e);
      setError('Something went wrong. Please try again.');
      setSaving(false);
    }
  };

  if (showAccountCreated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <AccountCreated name={piqueUser?.name} onDone={finishAccountCreated} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.logo, { opacity: logoOpacity }]}>
          <PiqueMark size={72} />
        </Animated.View>

        <Text style={styles.heading} accessibilityRole="header">
          Meet Frank.
        </Text>
        <Text style={styles.body}>
          Frank writes every card you see — a question, a fact, or a take worth a few seconds of
          real thought. Your answers shape what Frank shows you next. The more honest you are, the
          better your feed gets. There are no right or wrong answers.
        </Text>

        <View style={styles.divider} />

        <Text style={styles.subheading} accessibilityRole="header">
          How Pique works
        </Text>
        <View style={styles.rows}>
          {HOW_IT_WORKS.map((row) => (
            <View key={row.icon} style={styles.row}>
              <Text style={styles.rowIcon} accessibilityElementsHidden>
                {row.icon}
              </Text>
              <Text style={styles.rowText}>{row.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          {error && <Text style={styles.error}>{error}</Text>}
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={handleContinue}
            disabled={saving}
            accessibilityRole="button"
            accessibilityState={{ busy: saving, disabled: saving }}
          >
            {saving ? (
              <ActivityIndicator color={Colors.amber} />
            ) : (
              <Text style={styles.buttonText}>Meet Frank →</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.navy,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.xl,
    paddingBottom: Theme.spacing.lg,
  },
  logo: {
    alignSelf: 'center',
    marginBottom: Theme.spacing.xl,
  },
  heading: {
    color: Colors.white,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.xxl,
    marginBottom: Theme.spacing.md,
  },
  body: {
    color: Colors.lavenderGrey,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.md,
    lineHeight: 26,
  },
  divider: {
    alignSelf: 'center',
    width: 60,
    height: 1,
    backgroundColor: Colors.violet,
    marginVertical: Theme.spacing.xl,
  },
  subheading: {
    color: Colors.violet,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: Theme.spacing.md,
  },
  rows: {
    gap: Theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Theme.spacing.md,
  },
  rowIcon: {
    fontSize: Theme.fontSize.lg,
    lineHeight: 24,
  },
  rowText: {
    flex: 1,
    color: Colors.white,
    fontFamily: Theme.fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: Theme.spacing.xl,
    gap: Theme.spacing.md,
  },
  error: {
    color: Colors.amber,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.sm,
    textAlign: 'center',
  },
  button: {
    height: 56,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Colors.navy,
    // A navy button on a navy screen needs an edge to read as a button.
    borderColor: Colors.amber,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    backgroundColor: Colors.darkPurple,
  },
  buttonText: {
    color: Colors.amber,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.md,
  },
});
