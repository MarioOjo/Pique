import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SessionAnswer } from '@/hooks/useCards';
import { frankTakeFor } from '@/hooks/useRecentTakes';
import type { Card } from '@/types';

export interface ScoredAnswer {
  card: Card;
  score: number;
  // Frank's one-line reason, when there is one worth showing.
  take?: string;
}

export interface SessionVerdict {
  scored: ScoredAnswer[];
  // Every answer has its score.
  allScored: boolean;
  // Scoring is taking longer than it should (offline, or a slow call).
  timedOut: boolean;
  // The session's answers' scores added up.
  sessionPoints: number;
  // The highest-scoring answer (on a tie, one with a reason to show), or
  // null if nothing scored well enough to celebrate.
  best: ScoredAnswer | null;
}

// Scores usually land within a few seconds of the last answer.
const SCORING_TIMEOUT_MS = 20000;
// Below this, no answer is held up as the session's best.
const MIN_BEST_SCORE = 5;

// Live scores for this session's answers, as scoreResponse writes them.
export function useSessionVerdict(answers: SessionAnswer[]): SessionVerdict {
  const [scores, setScores] = useState<Record<string, ScoredAnswer>>({});
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const unsubscribes = answers.map(({ interactionId, card }) =>
      onSnapshot(
        doc(db, 'interactions', interactionId),
        (snapshot) => {
          if (!snapshot.get('scoredAt')) return;
          const scored: ScoredAnswer = {
            card,
            score: Number(snapshot.get('engagementScore') ?? 0),
            take: frankTakeFor(snapshot.get('scoredBy'), snapshot.get('scoreReason')),
          };
          setScores((previous) => ({ ...previous, [interactionId]: scored }));
        },
        (error) => console.warn('Failed to load a session score', error),
      ),
    );
    const timer = setTimeout(() => setTimedOut(true), SCORING_TIMEOUT_MS);
    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
      clearTimeout(timer);
    };
  }, [answers]);

  const scored = answers
    .map(({ interactionId }) => scores[interactionId])
    .filter((answer): answer is ScoredAnswer => answer !== undefined);
  const best = [...scored].sort(
    (a, b) => b.score - a.score || Number(Boolean(b.take)) - Number(Boolean(a.take)),
  )[0];

  return {
    scored,
    allScored: scored.length === answers.length,
    timedOut,
    sessionPoints: scored.reduce((sum, answer) => sum + answer.score, 0),
    best: best && best.score >= MIN_BEST_SCORE ? best : null,
  };
}
