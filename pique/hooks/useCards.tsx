import { useCallback, useEffect, useRef, useState } from 'react';
import { FirebaseError } from 'firebase/app';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  increment,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { minReadingTimeMs } from '@/lib/answerCheck';
import { generateCards, scoreResponse, updateStats } from '@/lib/claude';
import { db } from '@/lib/firebase';
import { DEFAULT_SESSION_SIZE } from '@/lib/onboarding';
// Fallback only, for when card generation fails.
import { MOCK_CARDS } from '@/lib/mockCards';
import type { Card, UserInterest } from '@/types';

// An answer given this session, for Frank's verdict at the end.
export interface SessionAnswer {
  interactionId: string;
  card: Card;
}

// Frank's response to a written answer.
export interface WrittenReply {
  reply?: string;
  // False when the answer didn't address the question.
  onTopic: boolean;
}

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
  // Saves and scores a written answer at once, for Frank's reply.
  answerInWriting: (responseText: string, timeOnCard: number) => Promise<WrittenReply | null>;
  // True until the first cards arrive.
  isLoading: boolean;
  // True while the rest of the session is still being written. The feed
  // shows the first cards in the meantime.
  isLoadingMore: boolean;
  error: string | null;
  // True when generation failed and the session uses sample cards.
  usingFallbackCards: boolean;
  // True when today's card allowance is used up and no session could load.
  outOfCardsToday: boolean;
  // False once the last session of the day has been handed out.
  moreCardsToday: boolean;
  // Goes up by one each time the user answers several cards in a row too
  // quickly to have read them, so the feed can ask them to slow down.
  slowDownNudges: number;
  // This session's answers (not skips), once each is saved.
  sessionAnswers: SessionAnswer[];
}

const TOP_INTEREST_COUNT = 3;
// Too-quick answers in a row before Frank asks the user to slow down.
const QUICK_ANSWERS_BEFORE_NUDGE = 3;
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
// in parallel. Each interest's cards are handed to onCards as soon as they
// arrive, so the feed can start before the slowest call finishes.
// Interests whose generation fails are left out.
async function generateSessionCards(
  userId: string,
  sessionSize: number,
  onCards: (cards: Card[]) => void,
): Promise<GeneratedSession> {
  const interests = await getTopInterests(userId);
  if (interests.length === 0) return { cards: [], limitReached: false, remainingToday: null };

  const counts = distributeCards(sessionSize, interests.length);
  const results = await Promise.allSettled(
    interests.map(async (interest, i) => {
      const result = await generateCards(userId, interest.interestId, counts[i]);
      if (result.cards.length > 0) onCards(result.cards);
      return result;
    }),
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
  const { user, piqueUser } = useAuth();
  // Chosen during onboarding; older accounts get the default. Read through a
  // ref so a profile update doesn't change loadCards and trigger a second,
  // quota-using generation.
  const sessionSize = piqueUser?.sessionSize ?? DEFAULT_SESSION_SIZE;
  const sessionSizeRef = useRef(sessionSize);
  useEffect(() => {
    sessionSizeRef.current = sessionSize;
  }, [sessionSize]);
  const [sessionCards, setSessionCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [engagedCount, setEngagedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // The session size this load is aiming for.
  const [plannedSize, setPlannedSize] = useState(0);
  // Identifies the latest load, so cards from an older one are ignored.
  const loadId = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [usingFallbackCards, setUsingFallbackCards] = useState(false);
  const [outOfCardsToday, setOutOfCardsToday] = useState(false);
  const [remainingToday, setRemainingToday] = useState<number | null>(null);
  // Mirrors currentIndex so a double tap can't record or advance twice
  // before React re-renders.
  const indexRef = useRef(0);
  const quickAnswersInARow = useRef(0);
  // Written attempts at the current card: whether any was on topic, and
  // any whose scoring failed and needs retrying.
  const written = useRef<{ cardId: string; onTopic: boolean; unscored: string[] } | null>(null);
  const [slowDownNudges, setSlowDownNudges] = useState(0);
  const [sessionAnswers, setSessionAnswers] = useState<SessionAnswer[]>([]);

  const loadCards = useCallback(async () => {
    const id = ++loadId.current;
    const size = sessionSizeRef.current;
    setIsLoading(true);
    setIsLoadingMore(true);
    setPlannedSize(size);
    setError(null);
    setSessionCards([]);
    setSessionAnswers([]);
    setUsingFallbackCards(false);
    setCurrentIndex(0);
    setEngagedCount(0);
    indexRef.current = 0;
    quickAnswersInARow.current = 0;
    written.current = null;

    // The first batch starts the session; later ones are shuffled in among
    // the cards not yet shown, so the topics still mix.
    const addCards = (batch: Card[]) => {
      if (id !== loadId.current) return;
      setSessionCards((previous) => {
        const shown = previous.slice(0, indexRef.current + 1);
        const upcoming = shuffle([...previous.slice(indexRef.current + 1), ...batch]);
        return [...shown, ...upcoming].slice(0, size);
      });
      setIsLoading(false);
    };

    try {
      const session = user
        ? await generateSessionCards(user.uid, size, addCards)
        : { cards: [], limitReached: false, remainingToday: null };
      if (id !== loadId.current) return;
      setRemainingToday(session.remainingToday);
      setOutOfCardsToday(session.limitReached);
      // Out of cards for today is a real stop, not a failure: no samples.
      if (session.cards.length === 0 && !session.limitReached) {
        console.warn('No generated cards available; using sample cards');
        setSessionCards(shuffle(MOCK_CARDS).slice(0, size));
        setUsingFallbackCards(true);
      }
    } catch (e) {
      if (id !== loadId.current) return;
      console.warn('Failed to load cards', e);
      setError('Check your connection and try again.');
    } finally {
      if (id === loadId.current) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  }, [user]);

  // Saves an interaction. Resolves to its ID, or null if there's no user or
  // the write failed.
  const record = useCallback(
    async (card: Card, responseText: string, timeOnCard: number, skipped: boolean) => {
      if (!user) return null;
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
        return ref.id;
      } catch (e) {
        console.warn('Failed to record interaction', e);
        return null;
      }
    },
    [user],
  );

  // Moves to the next card, counting an answer and watching for rushing.
  const advance = useCallback((card: Card, timeOnCard: number, answered: boolean) => {
    const index = indexRef.current;
    indexRef.current = index + 1;
    setCurrentIndex(index + 1);
    if (!answered) return;
    setEngagedCount((count) => count + 1);
    // The same limit the server scores against. Skips don't count either way.
    const quick = timeOnCard < minReadingTimeMs(`${card.body} ${card.prompt}`);
    quickAnswersInARow.current = quick ? quickAnswersInARow.current + 1 : 0;
    if (quickAnswersInARow.current >= QUICK_ANSWERS_BEFORE_NUDGE) {
      quickAnswersInARow.current = 0;
      setSlowDownNudges((count) => count + 1);
    }
  }, []);

  // Scores and updates stats without holding anything up.
  const finishInBackground = useCallback(
    async (interactionIds: string[], answered: boolean) => {
      if (!user) return;
      // Runs once the writes are confirmed, so the functions can read them.
      // Skips are scored too (they lower the interest's weight) but don't
      // change stats, which only count answers.
      const background: Promise<unknown>[] = interactionIds.map((id) => scoreResponse(id));
      if (answered) background.push(updateStats(user.uid));
      const results = await Promise.allSettled(background);
      results.forEach((result) => {
        if (result.status === 'rejected') {
          console.warn('Background scoring/stats update failed', result.reason);
        }
      });
    },
    [user],
  );

  // A written answer: saved and scored straight away, so Frank can reply
  // on the card. Resolves to his reply, or null if saving or scoring
  // failed (the card still works; scoring is retried on Next).
  const answerInWriting = useCallback(
    async (responseText: string, timeOnCard: number): Promise<WrittenReply | null> => {
      const card = sessionCards[indexRef.current];
      if (!card) return null;
      const load = loadId.current;
      const attempts =
        written.current?.cardId === card.id
          ? written.current
          : { cardId: card.id, onTopic: false, unscored: [] as string[] };
      written.current = attempts;

      const interactionId = await record(card, responseText, timeOnCard, false);
      if (!interactionId) return null;
      try {
        const result = await scoreResponse(interactionId);
        if (result.onTopic) {
          attempts.onTopic = true;
          if (load === loadId.current) {
            setSessionAnswers((answers) => [...answers, { interactionId, card }]);
          }
          // The user gave up waiting and moved on, so Next didn't count
          // this answer; bring the stats up to date now.
          if (written.current !== attempts && user) {
            updateStats(user.uid).catch((e: unknown) => console.warn('Stats update failed', e));
          }
        }
        return { reply: result.reply, onTopic: result.onTopic };
      } catch (e) {
        console.warn('Scoring a written answer failed', e);
        attempts.unscored.push(interactionId);
        if (load === loadId.current) {
          setSessionAnswers((answers) => [...answers, { interactionId, card }]);
        }
        return null;
      }
    },
    [sessionCards, record, user],
  );

  // Called from Next. Nothing here blocks the user: the card advances
  // first, then the write, scoring and stats run in the background. A slow
  // or offline connection never holds up the feed; Firestore queues the
  // write and syncs when it can.
  const submitResponse = useCallback(
    async (responseText: string, timeOnCard: number) => {
      const card = sessionCards[indexRef.current];
      if (!card) return;

      // Already saved and scored by answerInWriting. It counts as an answer
      // unless every attempt was off-topic.
      const attempts = written.current;
      if (attempts?.cardId === card.id) {
        written.current = null;
        const answered = attempts.onTopic || attempts.unscored.length > 0;
        advance(card, timeOnCard, answered);
        void finishInBackground(attempts.unscored, answered);
        return;
      }

      const load = loadId.current;
      advance(card, timeOnCard, true);
      const interactionId = await record(card, responseText, timeOnCard, false);
      if (!interactionId) return;
      if (load === loadId.current) {
        setSessionAnswers((answers) => [...answers, { interactionId, card }]);
      }
      await finishInBackground([interactionId], true);
    },
    [sessionCards, advance, record, finishInBackground],
  );

  const skipCard = useCallback(
    (timeOnCard: number) => {
      const card = sessionCards[indexRef.current];
      if (!card) return;
      // A card skipped after an off-topic attempt keeps that attempt; it
      // just doesn't count.
      if (written.current?.cardId === card.id) written.current = null;
      advance(card, timeOnCard, false);
      void (async () => {
        const interactionId = await record(card, '', timeOnCard, true);
        if (interactionId) await finishInBackground([interactionId], false);
      })();
    },
    [sessionCards, advance, record, finishInBackground],
  );


  // Counts each finished session once, if anything was answered. Rules
  // only let the count go up by one at a time.
  const countedLoad = useRef(0);
  const isSessionComplete =
    !isLoadingMore && sessionCards.length > 0 && currentIndex >= sessionCards.length;
  useEffect(() => {
    if (!isSessionComplete || !user || engagedCount === 0) return;
    if (countedLoad.current === loadId.current) return;
    countedLoad.current = loadId.current;
    updateDoc(doc(db, 'users', user.uid), { sessionsCompleted: increment(1) }).catch(
      (e: unknown) => console.warn('Failed to count session', e),
    );
  }, [isSessionComplete, user, engagedCount]);

  // While cards are still arriving, count the whole planned session so the
  // progress bar doesn't jump.
  const totalCards = isLoadingMore
    ? Math.max(sessionCards.length, plannedSize)
    : sessionCards.length;

  return {
    currentCard: sessionCards[currentIndex] ?? null,
    sessionCards,
    currentIndex,
    totalCards,
    engagedCount,
    isSessionComplete,
    loadCards,
    submitResponse,
    skipCard,
    answerInWriting,
    isLoading,
    isLoadingMore,
    error,
    usingFallbackCards,
    outOfCardsToday,
    moreCardsToday: remainingToday === null || remainingToday > 0,
    slowDownNudges,
    sessionAnswers,
  };
}
