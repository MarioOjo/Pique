import { useState } from 'react';
import { OptionCard, QuestionScreen, useSaveAnswer } from '@/components/onboarding/QuestionScreen';
import { useAuth } from '@/hooks/useAuth';
import { AGE_BANDS, STEP, type AgeBand } from '@/lib/onboarding';

// First question after the Frank intro. Required: Frank pitches cards to it.
export default function OnboardingAgeScreen() {
  const { piqueUser } = useAuth();
  const [selected, setSelected] = useState<AgeBand | null>(() => piqueUser?.ageBand ?? null);
  const { save, saving, error } = useSaveAnswer();

  return (
    <QuestionScreen
      step={STEP.age}
      eyebrow="Before we pick your topics"
      heading="How old are you?"
      subheading="Frank pitches his cards to your stage of life."
      footnote="Pique is for adults aged 18 and over."
      error={error}
      saving={saving}
      canContinue={selected !== null}
      onContinue={() => selected && save({ ageBand: selected }, '/onboarding')}
    >
      {AGE_BANDS.map((band) => (
        <OptionCard
          key={band.id}
          label={band.label}
          selected={selected === band.id}
          onPress={() => setSelected(band.id)}
          centred
        />
      ))}
    </QuestionScreen>
  );
}
