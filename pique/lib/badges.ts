import type { StatsSummary } from '@/hooks/useStats';
import { LEVELS } from '@/lib/levels';

export interface Badge {
  id: string;
  emoji: string;
  name: string;
  // How to earn it, shown while it's locked.
  howToEarn: string;
  earned: (stats: StatsSummary) => boolean;
}

const SAGE_POINTS = LEVELS.find((level) => level.name === 'Sage')?.minPoints ?? 750;

// Milestones, in the order they're shown. Each is worked out from stats,
// so earning one needs no extra writes.
export const BADGES: readonly Badge[] = [
  {
    id: 'first-take',
    emoji: '💡',
    name: 'First thought',
    howToEarn: 'Answer your first card.',
    earned: (s) => s.totalResponses >= 1,
  },
  {
    id: 'ten-cards',
    emoji: '📚',
    name: 'Getting into it',
    howToEarn: 'Answer 10 cards.',
    earned: (s) => s.totalResponses >= 10,
  },
  {
    id: 'fifty-cards',
    emoji: '🌊',
    name: 'Deep diver',
    howToEarn: 'Answer 50 cards.',
    earned: (s) => s.totalResponses >= 50,
  },
  {
    id: 'streak-3',
    emoji: '🔥',
    name: 'On a roll',
    howToEarn: 'Answer cards 3 days in a row.',
    earned: (s) => s.longestStreak >= 3,
  },
  {
    id: 'streak-7',
    emoji: '📅',
    name: 'Week strong',
    howToEarn: 'Answer cards 7 days in a row.',
    earned: (s) => s.longestStreak >= 7,
  },
  {
    id: 'sharp-take',
    emoji: '⭐',
    name: 'Sharp take',
    howToEarn: 'Get a score of 9 or more from Frank.',
    earned: (s) => s.bestScore >= 9,
  },
  {
    id: 'century',
    emoji: '💯',
    name: 'Century',
    howToEarn: 'Earn 100 points.',
    earned: (s) => s.points >= 100,
  },
  {
    id: 'sage',
    emoji: '🏛️',
    name: 'Sage',
    howToEarn: 'Reach the Sage level.',
    earned: (s) => s.points >= SAGE_POINTS,
  },
];
