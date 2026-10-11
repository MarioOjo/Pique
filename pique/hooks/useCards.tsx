import { useCallback, useRef, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { scoreResponse, updateStats } from '@/lib/claude';
import { db } from '@/lib/firebase';
import { MOCK_CARDS } from '@/lib/mockCards';
import type { Card } from '@/types';

const SESSION_SIZE = 10;

interface UseCardsResult {
  currentCard: Card | null;
  sessionCards: Card[];
  currentIndex: number;
  totalCards: number;
  // Cards answered (not skipped) this session.
  engagedCount: number;
  isSessionComplete: boolean;
  loadCards: () => Promise<void>;
  submitResponse: (responseText: string, timeOnCard: number) => Promise<void>;
  skipCard: (timeOnCard: number) => void;
  isLoading: boolean;
  error: string | null;
}

// Fisher–Yates shuffle; returns a new array.
function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function useCards(): UseCardsResult {
  const { user } = useAuth();
  const [sessionCards, setSessionCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [engagedCount, setEngagedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Mirrors currentIndex so a double tap can't record or advance twice
  // before React re-renders.
  const indexRef = useRef(0);

  const loadCards = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // TODO: replace with cards from Firestore once generateCards is deployed.
      const cards = shuffle(MOCK_CARDS).slice(0, SESSION_SIZE);
      setSessionCards(cards);
      setCurrentIndex(0);
      setEngagedCount(0);
      indexRef.current = 0;
    } catch (e) {
      console.warn('Failed to load cards', e);
      setError('We couldn’t load your cards. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Records the interaction and advances. Nothing here blocks the user:
  // the card advances first, then the write, scoring and stats run in the
  // background. A slow or offline connection never holds up the feed;
  // Firestore queues the write and syncs when it can.
  const recordAndAdvance = useCallback(
    async (responseText: string, timeOnCard: number, skipped: boolean) => {
      const index = indexRef.current;
      const card = sessionCards[index];
      if (!card) return;

      indexRef.current = index + 1;
      setCurrentIndex(index + 1);
      if (!skipped) setEngagedCount((count) => count + 1);

      if (!user) return;
      let interactionId: string;
      try {
        const ref = await addDoc(collection(db, 'interactions'), {
          userId: user.uid,
          cardId: card.id,
          responseText,
          engagementScore: 0,
          timeOnCard: Math.max(0, Math.round(timeOnCard)),
          skipped,
          createdAt: serverTimestamp(),
        });
        interactionId = ref.id;
      } catch (e) {
        console.warn('Failed to record interaction', e);
        return;
      }

      // Runs once the write is confirmed, so the functions can read it.
      // Skips are scored too (they lower the interest's weight) but don't
      // change stats, which only count responses.
      const background: Promise<unknown>[] = [scoreResponse(interactionId)];
      if (!skipped) background.push(updateStats(user.uid));
      const results = await Promise.allSettled(background);
      results.forEach((result) => {
        if (result.status === 'rejected') {
          console.warn('Background scoring/stats update failed', result.reason);
        }
      });
    },
    [sessionCards, user],
  );

  const submitResponse = useCallback(
    (responseText: string, timeOnCard: number) =>
      recordAndAdvance(responseText, timeOnCard, false),
    [recordAndAdvance],
  );

  const skipCard = useCallback(
    (timeOnCard: number) => {
      void recordAndAdvance('', timeOnCard, true);
    },
    [recordAndAdvance],
  );

  const totalCards = sessionCards.length;

  return {
    currentCard: sessionCards[currentIndex] ?? null,
    sessionCards,
    currentIndex,
    totalCards,
    engagedCount,
    isSessionComplete: totalCards > 0 && currentIndex >= totalCards,
    loadCards,
    submitResponse,
    skipCard,
    isLoading,
    error,
  };
}
