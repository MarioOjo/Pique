import { useState } from 'react';
import { OptionCard, QuestionScreen, useSaveAnswer } from '@/components/onboarding/QuestionScreen';
import { useAuth } from '@/hooks/useAuth';
import { DEFAULT_SESSION_SIZE, SESSION_SIZES, STEP, type SessionSize } from '@/lib/onboarding';

const NEXT = '/onboarding-summary';

// How many cards each session has; useCards reads it.
export default function OnboardingRhythmScreen() {
  const { piqueUser } = useAuth();
  const [selected, setSelected] = useState<SessionSize | null>(
    () => piqueUser?.sessionSize ?? null,
  );
  const { save, saving, error } = useSaveAnswer();

  return (
    <QuestionScreen
      step={STEP.rhythm}
      heading="How long should a session be?"
      subheading="Each session ends after this many cards. Start another whenever you like."
      error={error}
      saving={saving}
      canContinue={selected !== null}
      onContinue={() => selected && save({ sessionSize: selected }, NEXT)}
      skipLabel={`Skip — I’ll start with ${DEFAULT_SESSION_SIZE}`}
      onSkip={() => save({ sessionSize: DEFAULT_SESSION_SIZE }, NEXT)}
    >
      {SESSION_SIZES.map((size) => (
        <OptionCard
          key={size.count}
          label={size.label}
          sub={size.sub}
          leading={String(size.count)}
          selected={selected === size.count}
          onPress={() => setSelected(size.count)}
        />
      ))}
    </QuestionScreen>
  );
}
