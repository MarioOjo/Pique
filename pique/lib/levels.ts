// Thinker levels. Every answer earns its Frank score (1–10) as points, so a
// typical 10-card session is worth about 50. The first level-up comes in
// the first session; later ones take days, then weeks.
export const LEVELS = [
  { name: 'Curious', minPoints: 0 },
  { name: 'Thinker', minPoints: 40 },
  { name: 'Questioner', minPoints: 120 },
  { name: 'Sharp', minPoints: 250 },
  { name: 'Insightful', minPoints: 450 },
  { name: 'Sage', minPoints: 750 },
  { name: 'Philosopher', minPoints: 1200 },
] as const;

export interface LevelInfo {
  // 1-based, for display.
  number: number;
  name: string;
  // The next level, or null at the top.
  next: { name: string; pointsToGo: number } | null;
  // How far through this level, from 0 to 1. 1 at the top level.
  progress: number;
}

export function levelFor(points: number): LevelInfo {
  let index = 0;
  while (index + 1 < LEVELS.length && points >= LEVELS[index + 1].minPoints) index++;
  const current = LEVELS[index];
  const next = LEVELS[index + 1];
  if (!next) return { number: index + 1, name: current.name, next: null, progress: 1 };
  return {
    number: index + 1,
    name: current.name,
    next: { name: next.name, pointsToGo: next.minPoints - points },
    progress: (points - current.minPoints) / (next.minPoints - current.minPoints),
  };
}
