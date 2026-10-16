import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MOCK_CARDS } from '@/lib/mockCards';
import type { CardType } from '@/types';

export interface RecentTake {
  id: string;
  interestId: string;
  cardType: CardType;
  // 'agree' / 'disagree' for perspective cards, the written answer for recall.
  responseText: string;
  body: string;
  // Claude’s one-line reason for the score. Missing until the response is
  // scored, and for answers a pre-check scored (those reasons are generic).
  frankTake?: string;
}

const RECENT_TAKE_COUNT = 5;

// Looks up the card an interaction answered. Sample cards only exist in the
// app, so they're found in MOCK_CARDS instead of Firestore.
async function loadCard(cardId: string) {
  const mock = MOCK_CARDS.find((card) => card.id === cardId);
  if (mock) return { interestId: mock.interestId, type: mock.type, body: mock.body };
  try {
    const snapshot = await getDoc(doc(db, 'cards', cardId));
    if (!snapshot.exists()) return null;
    return {
      interestId: String(snapshot.get('interestId')),
      type: snapshot.get('type') as CardType,
      body: String(snapshot.get('body')),
    };
  } catch (error) {
    console.warn('Failed to load card for recent take', error);
    return null;
  }
}

// Live list of the user's last few answered (not skipped) cards, newest first.
// Needs the interactions (userId, skipped, createdAt desc) index in
// firestore.indexes.json.
export function useRecentTakes(userId: string | undefined): {
  takes: RecentTake[];
  loading: boolean;
} {
  const [takes, setTakes] = useState<RecentTake[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const recent = query(
      collection(db, 'interactions'),
      where('userId', '==', userId),
      where('skipped', '==', false),
      orderBy('createdAt', 'desc'),
      limit(RECENT_TAKE_COUNT),
    );
    const unsubscribe = onSnapshot(
      recent,
      async (snapshot) => {
        const loaded = await Promise.all(
          snapshot.docs.map(async (interaction): Promise<RecentTake | null> => {
            const card = await loadCard(String(interaction.get('cardId')));
            if (!card) return null;
            return {
              id: interaction.id,
              interestId: card.interestId,
              cardType: card.type,
              responseText: String(interaction.get('responseText') ?? ''),
              body: card.body,
              frankTake:
                interaction.get("scoredBy") === "claude" && interaction.get("scoreReason")
                  ? String(interaction.get("scoreReason"))
                  : undefined,
            };
          }),
        );
        if (cancelled) return;
        setTakes(loaded.filter((take): take is RecentTake => take !== null));
        setLoadedFor(userId);
      },
      (error) => {
        console.warn('Failed to load recent takes', error);
        setTakes([]);
        setLoadedFor(userId);
      },
    );
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [userId]);

  return { takes, loading: Boolean(userId) && loadedFor !== userId };
}
