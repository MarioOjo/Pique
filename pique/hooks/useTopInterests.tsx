import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserInterest } from '@/types';

// Live view of the user's interests, highest weight first. Weights change
// as scoreResponse scores their responses.
export function useTopInterests(
  userId: string | undefined,
  limit: number,
): { interests: UserInterest[]; loading: boolean } {
  const [interests, setInterests] = useState<UserInterest[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    return onSnapshot(
      collection(db, 'users', userId, 'interests'),
      (snapshot) => {
        const sorted = snapshot.docs
          .map((doc) => ({
            interestId: String(doc.get('interestId') ?? doc.id),
            weight: Number(doc.get('weight') ?? 1),
          }))
          .sort((a, b) => b.weight - a.weight);
        setInterests(sorted.slice(0, limit));
        setLoadedFor(userId);
      },
      (error) => {
        console.warn('Failed to load interests', error);
        setInterests([]);
        setLoadedFor(userId);
      },
    );
  }, [userId, limit]);

  return { interests, loading: Boolean(userId) && loadedFor !== userId };
}
