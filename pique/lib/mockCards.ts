import type { Card } from '@/types';

// Fallback only: useCards serves these when Claude card generation fails
// (function unavailable, daily limit reached, no interests yet).

const DAY_MS = 24 * 60 * 60 * 1000;

// source.unsplash.com has been shut down, so these use Lorem Picsum, which
// serves Unsplash photos. Seeded URLs return the same photo every time
// (not topic-matched).
function imageFor(seed: string): string {
  return `https://picsum.photos/seed/pique-${seed}/800/400`;
}

function mockCard(card: Omit<Card, 'status' | 'createdAt' | 'expiresAt'>): Card {
  return {
    ...card,
    status: 'active',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * DAY_MS),
  };
}

export const MOCK_CARDS: readonly Card[] = [
  mockCard({
    id: 'mock-1',
    interestId: 'philosophy',
    type: 'perspective',
    body: 'Absolute freedom is impossible in any organised society.',
    prompt: 'Do you agree or disagree — and what would you give up freedom for?',
    counterpoint:
      'Without constraints, cooperation breaks down entirely. Every right you have exists because someone else agreed to limit their own.',
    imageUrl: imageFor('philosophy'),
    imageCredit: 'Unsplash',
    difficulty: 3,
  }),
  mockCard({
    id: 'mock-2',
    interestId: 'science',
    type: 'recall',
    body: 'Entropy is a measure of how many ways a system can be arranged. Left alone, systems drift toward the arrangements that are most likely — which is why ice melts in a warm room but never refreezes by itself.',
    prompt: 'Where do you see entropy at work in your own daily life?',
    imageUrl: imageFor('science'),
    imageCredit: 'Unsplash',
    difficulty: 2,
  }),
  mockCard({
    id: 'mock-3',
    interestId: 'technology',
    type: 'perspective',
    body: 'Recommendation algorithms know what you want better than you do.',
    prompt: 'Agree or disagree — is being predictable the same as being known?',
    counterpoint:
      'Algorithms optimise for what keeps you engaged, not what you value. Predicting your next click is different from understanding what you would choose on reflection.',
    difficulty: 2,
  }),
  mockCard({
    id: 'mock-4',
    interestId: 'psychology',
    type: 'recall',
    body: 'The spotlight effect is our tendency to overestimate how much other people notice our appearance and mistakes. In studies, people thought twice as many others noticed an embarrassing T-shirt as actually did.',
    prompt: 'Describe a moment when you felt watched — would anyone else remember it?',
    imageUrl: imageFor('psychology'),
    imageCredit: 'Unsplash',
    difficulty: 1,
  }),
  mockCard({
    id: 'mock-5',
    interestId: 'art',
    type: 'perspective',
    body: 'Art made by AI can be just as meaningful as art made by humans.',
    prompt: 'Agree or disagree — does meaning come from the maker or the viewer?',
    counterpoint:
      'Much of art’s meaning comes from intent and lived experience. A painting of grief means something different when you know the artist was grieving.',
    imageUrl: imageFor('art'),
    imageCredit: 'Unsplash',
    difficulty: 3,
  }),
  mockCard({
    id: 'mock-6',
    interestId: 'culture',
    type: 'recall',
    body: 'Cultural appropriation and cultural exchange can look similar from the outside. The difference often lies in power, credit and context — who benefits, who is acknowledged, and whether meaning is preserved.',
    prompt: 'Think of something you’ve adopted from another culture. How did it reach you?',
    difficulty: 4,
  }),
  mockCard({
    id: 'mock-7',
    interestId: 'philosophy',
    type: 'recall',
    body: 'The Ship of Theseus asks whether a ship that has had every plank replaced is still the same ship. The puzzle applies to people too — nearly every cell in your body is replaced over time.',
    prompt: 'What makes you the same person you were ten years ago?',
    imageUrl: imageFor('theseus'),
    imageCredit: 'Unsplash',
    difficulty: 4,
  }),
  mockCard({
    id: 'mock-8',
    interestId: 'science',
    type: 'perspective',
    body: 'Humanity should prioritise colonising Mars over fixing problems on Earth.',
    prompt: 'Agree or disagree — is a backup planet insurance or escapism?',
    counterpoint:
      'Even the harshest place on Earth is far more habitable than Mars. The resources for a Mars colony could transform life for billions of people here.',
    difficulty: 3,
  }),
  mockCard({
    id: 'mock-9',
    interestId: 'technology',
    type: 'recall',
    body: 'End-to-end encryption means only the sender and recipient can read a message — not even the company running the service. Governments argue this shields criminals; privacy advocates argue any backdoor weakens security for everyone.',
    prompt: 'Should there ever be an exception to private communication? Explain where you’d draw the line.',
    imageUrl: imageFor('technology'),
    imageCredit: 'Unsplash',
    difficulty: 5,
  }),
  mockCard({
    id: 'mock-10',
    interestId: 'psychology',
    type: 'perspective',
    body: 'Willpower is a limited resource that runs out the more you use it.',
    prompt: 'Agree or disagree — does self-control get used up like fuel?',
    counterpoint:
      'Large replication attempts failed to reproduce “ego depletion”. Some research suggests that believing willpower is limited is what makes it feel limited.',
    difficulty: 5,
  }),
];
