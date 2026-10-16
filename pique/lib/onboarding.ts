// Onboarding steps and the profile answers collected along the way.
// Keep the option ids in sync with firestore.rules and with the prompt
// lookups in functions/src/generators/cardGenerator.ts.

export const AGE_BANDS = [
  { id: '18-24', label: '18 – 24' },
  { id: '25-34', label: '25 – 34' },
  { id: '35-44', label: '35 – 44' },
  { id: '45+', label: '45 +' },
] as const;
export type AgeBand = (typeof AGE_BANDS)[number]['id'];

export const WHY_OPTIONS = [
  {
    id: 'sharpen',
    label: 'Sharpen my thinking',
    emoji: '🧠',
    sub: 'Challenge assumptions and argue your corner',
    summary: 'sharpen your thinking',
  },
  {
    id: 'learn',
    label: 'Learn new things',
    emoji: '💡',
    sub: 'Discover ideas across every field',
    summary: 'learn new things',
  },
  {
    id: 'sides',
    label: 'Hear other sides',
    emoji: '⚖️',
    sub: 'Understand views you wouldn’t normally come across',
    summary: 'hear other sides',
  },
  {
    id: 'switch-off',
    label: 'Switch off from scrolling',
    emoji: '📵',
    sub: 'Replace mindless feeds with something meaningful',
    summary: 'switch off from scrolling',
  },
] as const;
export type WhyHere = (typeof WHY_OPTIONS)[number]['id'];
export const DEFAULT_WHY: WhyHere = 'learn';

// 1 = back me up, 5 = push back hard.
export const FRANK_STYLES = [
  { value: 1, label: 'Back me up', summary: 'back you up' },
  { value: 2, label: 'Mostly agree', summary: 'mostly agree with you' },
  { value: 3, label: 'Give both sides', summary: 'give you both sides' },
  { value: 4, label: 'Push a little', summary: 'push you a little' },
  { value: 5, label: 'Push back hard', summary: 'push back hard' },
] as const;
export type FrankStyle = (typeof FRANK_STYLES)[number]['value'];
export const DEFAULT_FRANK_STYLE: FrankStyle = 3;

export const SESSION_SIZES = [
  { count: 5, label: 'Light', sub: '5 cards  ·  about 5 min' },
  { count: 10, label: 'Regular', sub: '10 cards  ·  about 10 min' },
  { count: 15, label: 'Deep', sub: '15 cards  ·  about 15 min' },
] as const;
export type SessionSize = (typeof SESSION_SIZES)[number]['count'];
export const DEFAULT_SESSION_SIZE: SessionSize = 10;

// Every screen between the Frank intro and the feed, in order. The root
// layout leaves users on any of these until onboardingComplete is set.
export const ONBOARDING_ROUTES = [
  '/onboarding-age',
  '/onboarding',
  '/onboarding-why',
  '/onboarding-frank-style',
  '/onboarding-rhythm',
  '/onboarding-summary',
] as const;

// Progress dots: the two intro pages, then each question screen. The
// summary has no dots.
export const ONBOARDING_STEPS = 7;
export const STEP = {
  introApp: 1,
  introFrank: 2,
  age: 3,
  topics: 4,
  why: 5,
  frankStyle: 6,
  rhythm: 7,
} as const;

export function isAgeBand(value: unknown): value is AgeBand {
  return AGE_BANDS.some((band) => band.id === value);
}

export function isWhyHere(value: unknown): value is WhyHere {
  return WHY_OPTIONS.some((option) => option.id === value);
}

export function isFrankStyle(value: unknown): value is FrankStyle {
  return FRANK_STYLES.some((style) => style.value === value);
}

export function isSessionSize(value: unknown): value is SessionSize {
  return SESSION_SIZES.some((size) => size.count === value);
}
