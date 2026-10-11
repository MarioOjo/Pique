import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface StatsSummary {
  currentStreak: number;
  longestStreak: number;
  totalResponses: number;
}

const EMPTY_STATS: StatsSummary = { currentStreak: 0, longestStreak: 0, totalResponses: 0 };

function toNumber(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

// Live view of stats/{userId}, which the updateStats Cloud Function keeps
// current. All zeros until the user's first response creates the doc.
export function useStats(userId: string | undefined): {
  stats: StatsSummary;
  loading: boolean;
} {
  const [stats, setStats] = useState<StatsSummary>(EMPTY_STATS);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    return onSnapshot(
      doc(db, 'stats', userId),
      (snapshot) => {
        setStats({
          currentStreak: toNumber(snapshot.get('currentStreak')),
          longestStreak: toNumber(snapshot.get('longestStreak')),
          totalResponses: toNumber(snapshot.get('totalResponses')),
        });
        setLoadedFor(userId);
      },
      (error) => {
        console.warn('Failed to load stats', error);
        setStats(EMPTY_STATS);
        setLoadedFor(userId);
      },
    );
  }, [userId]);

  return { stats, loading: Boolean(userId) && loadedFor !== userId };
}
