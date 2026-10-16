import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { doc, updateDoc } from 'firebase/firestore';
import Svg, { Path } from 'react-native-svg';
import { AccountCreated } from '@/components/onboarding/AccountCreated';
import { PiqueMark } from '@/components/ui/PiqueMark';
import { ProgressDots } from '@/components/ui/ProgressDots';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { ONBOARDING_STEPS, STEP } from '@/lib/onboarding';

// Page 1: what Pique is and how it works.
const HOW_IT_WORKS = [
  { icon: '🃏', text: 'A card shows up: a question, a fact or a hot take.' },
  { icon: '💬', text: 'You answer before you move on. That’s the only rule.' },
  { icon: '🏁', text: 'A set number of cards, then the session ends. No bottomless feed.' },
] as const;

// Page 2: who Frank is and what he does.
const FRANK_DOES = [
  { icon: '✍️', text: 'Writes every card you see, around the topics you pick.' },
  { icon: '👂', text: 'Reads your answers. Honest beats clever, every time.' },
  { icon: '🔁', text: 'Learns from each one, so tomorrow’s cards fit you better.' },
] as const;

const LOGO_FADE_MS = 600;
const PAGE_OUT_MS = 180;
const PAGE_IN_MS = 320;
const PAGE_SLIDE = 24; // how far a page slides as it changes
const SPARK_SIZE = 72;
const SPARK_MS = 700; // Frank's sparkle twirling in

type Page = 'app' | 'frank';

// Shown once, between registering and picking interests. Opens with a
// short "Account created" confirmation, then two pages: how Pique works,
// then meet Frank.
export default function FrankIntroScreen() {
  const { user, piqueUser } = useAuth();
  const [showAccountCreated, setShowAccountCreated] = useState(true);
  const [page, setPage] = useState<Page>('app');
  const [values] = useState(() => ({
    logo: new Animated.Value(0),
    // 0 = hidden, 1 = shown; the page slides in from the side it came from.
    page: new Animated.Value(1),
    spark: new Animated.Value(0),
  }));
  const [direction, setDirection] = useState<1 | -1>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stable, so the confirmation's timer isn't restarted by re-renders.
  const finishAccountCreated = useCallback(() => setShowAccountCreated(false), []);

  useEffect(() => {
    if (showAccountCreated) return;
    Animated.timing(values.logo, {
      toValue: 1,
      duration: LOGO_FADE_MS,
      useNativeDriver: true,
    }).start();
  }, [showAccountCreated, values]);

  // Frank's sparkle twirls in each time his page opens.
  useEffect(() => {
    if (page !== 'frank') return;
    values.spark.setValue(0);
    const twirl = Animated.timing(values.spark, {
      toValue: 1,
      duration: SPARK_MS,
      delay: PAGE_IN_MS / 2,
      easing: Easing.out(Easing.back(1.4)),
      useNativeDriver: true,
    });
    twirl.start();
    return () => twirl.stop();
  }, [page, values]);

  const goTo = useCallback(
    (next: Page) => {
      setDirection(next === 'frank' ? 1 : -1);
      Animated.timing(values.page, {
        toValue: 0,
        duration: PAGE_OUT_MS,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        setPage(next);
        Animated.timing(values.page, {
          toValue: 1,
          duration: PAGE_IN_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      });
    },
    [values],
  );

  // Android back on Frank's page returns to page 1 instead of leaving.
  useEffect(() => {
    if (showAccountCreated || page !== 'frank') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goTo('app');
      return true;
    });
    return () => sub.remove();
  }, [showAccountCreated, page, goTo]);

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

  const pageStyle = {
    opacity: values.page,
    transform: [
      {
        translateX: values.page.interpolate({
          inputRange: [0, 1],
          outputRange: [PAGE_SLIDE * direction, 0],
        }),
      },
    ],
  };
  const sparkStyle = {
    opacity: values.spark,
    transform: [
      { rotate: values.spark.interpolate({ inputRange: [0, 1], outputRange: ['-180deg', '0deg'] }) },
      { scale: values.spark },
    ],
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.page, pageStyle]}>
          {page === 'app' ? (
            <>
              <Animated.View style={[styles.hero, { opacity: values.logo }]}>
                <PiqueMark size={72} />
              </Animated.View>

              <Text style={styles.eyebrow}>How Pique works</Text>
              <Text style={styles.heading} accessibilityRole="header">
                A feed that talks back.
              </Text>
              <Text style={styles.body}>
                Most feeds want your thumb. Pique wants your brain, for a few minutes a day.
              </Text>

              <Rows rows={HOW_IT_WORKS} />

              <Text style={styles.aim}>
                The goal: less mindless scrolling, more “huh, good point.”
              </Text>
            </>
          ) : (
            <>
              <View style={styles.hero}>
                <Animated.View style={sparkStyle} accessibilityElementsHidden>
                  <FrankSpark size={SPARK_SIZE} />
                </Animated.View>
              </View>

              <Text style={styles.eyebrow}>Your guide</Text>
              <Text style={styles.heading} accessibilityRole="header">
                Meet Frank.
              </Text>
              <Text style={styles.body}>
                Frank is the spark in the logo, and the mind behind your feed. Curious, a little
                nosy, never judgy.
              </Text>

              <Rows rows={FRANK_DOES} />

              <Text style={styles.aim}>
                There are no right or wrong answers. Frank just gets better the more honest you are.
              </Text>
            </>
          )}
        </Animated.View>

        <View style={styles.footer}>
          <ProgressDots
            total={ONBOARDING_STEPS}
            current={page === 'app' ? STEP.introApp : STEP.introFrank}
            color={Colors.amber}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          {page === 'app' ? (
            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              onPress={() => goTo('frank')}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>Who’s Frank? →</Text>
            </Pressable>
          ) : (
            <>
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
                  <Text style={styles.buttonText}>Pick my topics →</Text>
                )}
              </Pressable>
              <Pressable
                style={styles.back}
                onPress={() => goTo('app')}
                disabled={saving}
                accessibilityRole="button"
              >
                <Text style={styles.backText}>Back</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Rows({ rows }: { rows: readonly { icon: string; text: string }[] }) {
  return (
    <View style={styles.rows}>
      {rows.map((row) => (
        <View key={row.icon} style={styles.row}>
          <Text style={styles.rowIcon} accessibilityElementsHidden>
            {row.icon}
          </Text>
          <Text style={styles.rowText}>{row.text}</Text>
        </View>
      ))}
    </View>
  );
}

// Frank's amber sparkle, the same shape as the one on the Pique mark.
function FrankSpark({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="48 6 18 18">
      <Path
        d="M57 6 Q58.6 13.4 66 15 Q58.6 16.6 57 24 Q55.4 16.6 48 15 Q55.4 13.4 57 6 Z"
        fill={Colors.amber}
      />
    </Svg>
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
  page: {
    flexGrow: 1,
  },
  hero: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    height: SPARK_SIZE,
    marginBottom: Theme.spacing.xl,
  },
  eyebrow: {
    color: Colors.violet,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: Theme.spacing.sm,
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
    marginBottom: Theme.spacing.xl,
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
  aim: {
    color: Colors.amber,
    fontFamily: Theme.fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    marginTop: Theme.spacing.xl,
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
    borderRadius: Theme.borderRadius.lg,
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
  back: {
    alignSelf: 'center',
    minHeight: 44,
    paddingHorizontal: Theme.spacing.lg,
    justifyContent: 'center',
  },
  backText: {
    color: Colors.lavenderGrey,
    fontFamily: Theme.fontFamily.regular,
    fontSize: 15,
  },
});
