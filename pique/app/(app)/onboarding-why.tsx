import { useState } from 'react';
import { OptionCard, QuestionScreen, useSaveAnswer } from '@/components/onboarding/QuestionScreen';
import { useAuth } from '@/hooks/useAuth';
import { DEFAULT_WHY, STEP, WHY_OPTIONS, type WhyHere } from '@/lib/onboarding';

const NEXT = '/onboarding-frank-style';

export default function OnboardingWhyScreen() {
  const { piqueUser } = useAuth();
  const [selected, setSelected] = useState<WhyHere | null>(() => piqueUser?.whyHere ?? null);
  const { save, saving, error } = useSaveAnswer();

  return (
    <QuestionScreen
      step={STEP.why}
      heading="Why are you here?"
      subheading="Frank will match his cards to what you actually want."
      error={error}
      saving={saving}
      canContinue={selected !== null}
      onContinue={() => selected && save({ whyHere: selected }, NEXT)}
      skipLabel="Skip"
      onSkip={() => save({ whyHere: DEFAULT_WHY }, NEXT)}
    >
      {WHY_OPTIONS.map((option) => (
        <OptionCard
          key={option.id}
          label={option.label}
          sub={option.sub}
          leading={option.emoji}
          selected={selected === option.id}
          onPress={() => setSelected(option.id)}
        />
      ))}
    </QuestionScreen>
  );
}
