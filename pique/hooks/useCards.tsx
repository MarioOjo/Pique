import { useCallback, useRef, useState } from 'react';
import { FirebaseError } from 'firebase/app';
import { addDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { generateCards, scoreResponse, updateStats } from '@/lib/claude';
import { db } from '@/lib/firebase';
// Fallback only, for when card generation fails.
import { MOCK_CARDS } from '@/lib/mockCards';
import type { Card, UserInterest } from '@/types';

export const SESSION_SIZE = 10;

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
  // True when generation failed and the session uses sample cards.
  usingFallbackCards: boolean;
  // True when today's card allowance is used up and no session could load.
  outOfCardsToday: boolean;
  // False once the last session of the day has been handed out.
  moreCardsToday: boolean;
}

const TOP_INTEREST_COUNT = 3;
// generateCards accepts at most this many cards per call.
const MAX_CARDS_PER_CALL = 5;

// Splits the session across interests as evenly as possible, highest
// weighted first: 10 over 3 interests gives [4, 3, 3].
function distributeCards(total: number, buckets: number): number[] {
  const base = Math.floor(total / buckets);
  const extra = total % buckets;
  return Array.from({ length: buckets }, (_, i) =>
    Math.min(MAX_CARDS_PER_CALL, base + (i < extra ? 1 : 0)),
  );
}

// The user's top interests by weight, highest first.
async function getTopInterests(userId: string): Promise<UserInterest[]> {
  const snapshot = await getDocs(collection(db, 'users', userId, 'interests'));
  return snapshot.docs
    .map((doc) => ({
      interestId: String(doc.get('interestId') ?? doc.id),
      weight: Number(doc.get('weight') ?? 1),
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, TOP_INTEREST_COUNT);
}

interface GeneratedSession {
  cards: Card[];
  // Every call was refused because today's allowance is used up.
  limitReached: boolean;
  // Cards left today, or null if the function didn't say.
  remainingToday: number | null;
}

const isDailyLimitError = (reason: unknown) =>
  reason instanceof FirebaseError && reason.code === 'functions/resource-exhausted';

// Generates a session's worth of cards across the user's top interests,
// in parallel. Interests whose generation fails are left out.
async function generateSessionCards(userId: string): Promise<GeneratedSession> {
  const interests = await getTopInterests(userId);
  if (interests.length === 0) return { cards: [], limitReached: false, remainingToday: null };

  const counts = distributeCards(SESSION_SIZE, interests.length);
  const results = await Promise.allSettled(
    interests.map((interest, i) => generateCards(userId, interest.interestId, counts[i])),
  );

  const cards: Card[] = [];
  // The calls run in parallel, so the smallest count reported is the most
  // up to date.
  let remainingToday: number | null = null;
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      cards.push(...result.value.cards);
      const remaining = result.value.remainingToday;
      if (remaining !== undefined) {
        remainingToday = remainingToday === null ? remaining : Math.min(remainingToday, remaining);
      }
    } else if (!isDailyLimitError(result.reason)) {
      console.warn(`Card generation failed for ${interests[i].interestId}`, result.reason);
    }
  });
  const limitReached = results.every(
    (result) => result.status === 'rejected' && isDailyLimitError(result.reason),
  );
  if (limitReached) remainingToday = 0;
  return { cards, limitReached, remainingToday };
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
  const [usingFallbackCards, setUsingFallbackCards] = useState(false);
  const [outOfCardsToday, setOutOfCardsToday] = useState(false);
  const [remainingToday, setRemainingToday] = useState<number | null>(null);
  // Mirrors currentIndex so a double tap can't record or advance twice
  // before React re-renders.
  const indexRef = useRef(0);

  const loadCards = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const session = user
        ? await generateSessionCards(user.uid)
        : { cards: [], limitReached: false, remainingToday: null };
      setRemainingToday(session.remainingToday);
      setOutOfCardsToday(session.limitReached);
      let cards = session.cards;
      // Out of cards for today is a real stop, not a failure: no samples.
      const fallback = cards.length === 0 && !session.limitReached;
      if (fallback) {
        console.warn('No generated cards available; using sample cards');
        cards = [...MOCK_CARDS];
      }
      setSessionCards(shuffle(cards).slice(0, SESSION_SIZE));
      setUsingFallbackCards(fallback);
      setCurrentIndex(0);
      setEngagedCount(0);
      indexRef.current = 0;
    } catch (e) {
      console.warn('Failed to load cards', e);
      setError('We couldn’t load your cards. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

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
    usingFallbackCards,
    outOfCardsToday,
    moreCardsToday: remainingToday === null || remainingToday > 0,
  };
}
