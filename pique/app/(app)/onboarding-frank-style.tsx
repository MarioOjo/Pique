import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { QuestionScreen, useSaveAnswer } from '@/components/onboarding/QuestionScreen';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { makeStyles } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { DEFAULT_FRANK_STYLE, FRANK_STYLES, STEP, type FrankStyle } from '@/lib/onboarding';

const NEXT = '/onboarding-rhythm';
const MIN_TOUCH_TARGET = 44;

// A 5-point scale from "back me up" to "push back hard".
export default function OnboardingFrankStyleScreen() {
  const styles = useStyles();
  const { piqueUser } = useAuth();
  const [selected, setSelected] = useState<FrankStyle | null>(
    () => piqueUser?.frankStyle ?? null,
  );
  const { save, saving, error } = useSaveAnswer();
  const selectedLabel = FRANK_STYLES.find((style) => style.value === selected)?.label;

  return (
    <QuestionScreen
      step={STEP.frankStyle}
      heading="How should Frank talk to you?"
      subheading="Should Frank back you up, or challenge everything you think?"
      error={error}
      saving={saving}
      canContinue={selected !== null}
      onContinue={() => selected && save({ frankStyle: selected }, NEXT)}
      skipLabel="Skip — Frank will give both sides"
      onSkip={() => save({ frankStyle: DEFAULT_FRANK_STYLE }, NEXT)}
    >
      <View style={styles.card}>
        <View style={styles.ends}>
          <Text style={styles.endLabel}>{FRANK_STYLES[0].label}</Text>
          <Text style={styles.endLabel}>{FRANK_STYLES[FRANK_STYLES.length - 1].label}</Text>
        </View>

        <View style={styles.scale}>
          {FRANK_STYLES.map((style) => {
            const isSelected = selected === style.value;
            return (
              <Pressable
                key={style.value}
                style={styles.point}
                onPress={() => setSelected(style.value)}
                accessibilityRole="radio"
                accessibilityLabel={style.label}
                accessibilityState={{ selected: isSelected }}
              >
                <View style={[styles.dot, isSelected && styles.dotSelected]}>
                  {isSelected && <View style={styles.dotCentre} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Always rendered so the card doesn't change height on first pick. */}
        <Text style={styles.selectedLabel} accessibilityLiveRegion="polite">
          {selectedLabel ?? ' '}
        </Text>
      </View>
    </QuestionScreen>
  );
}

// White on the violet selected dot, in both modes.
const DOT_CENTRE = Colors.white;
const DOT = 22;
const DOT_SELECTED = 28;

const useStyles = makeStyles((c) => ({
  card: {
    backgroundColor: c.surface,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.lg,
    gap: Theme.spacing.sm,
  },
  ends: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  endLabel: {
    color: c.textSecondary,
    fontFamily: Theme.fontFamily.regular,
    fontSize: Theme.fontSize.sm,
  },
  scale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  point: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
    borderColor: c.textSecondary,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotSelected: {
    width: DOT_SELECTED,
    height: DOT_SELECTED,
    borderRadius: DOT_SELECTED / 2,
    borderColor: c.accent,
    backgroundColor: c.accent,
  },
  dotCentre: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: DOT_CENTRE,
  },
  selectedLabel: {
    color: c.accentText,
    fontFamily: Theme.fontFamily.semiBold,
    fontSize: Theme.fontSize.sm,
    textAlign: 'center',
  },
}));
