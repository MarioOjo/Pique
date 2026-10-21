// Frank — Pique's AI layer.
// All Claude API calls go through Firebase Cloud Functions, so the API key
// never touches the client bundle.

import { httpsCallable } from 'firebase/functions';
// Shared instance, so the emulator connection in lib/firebase.ts applies.
import { functions } from './firebase';
import type { Card, CardType } from '@/types';

// Mirrors CardGenerationRequest and the return value of generateCards in
// functions/src.
interface GenerateCardsRequest {
  userId: string;
  interestId: string;
  count: number;
}

// A saved card as the function returns it; dates are ISO strings because
// callable responses are plain JSON. Mirrors StoredCard in functions/src.
interface StoredCard {
  id: string;
  interestId: string;
  type: CardType;
  body: string;
  prompt: string;
  counterpoint?: string;
  difficulty: number;
  status: 'active';
  createdAt: string;
  expiresAt: string;
}

export interface GenerateCardsResponse {
  success: boolean;
  cardsGenerated: number;
  message: string;
  cards: Card[];
  // Cards the user can still generate today. Optional so an older deployed
  // function without it still works.
  remainingToday?: number;
}

function toCard(stored: StoredCard): Card {
  return {
    ...stored,
    createdAt: new Date(stored.createdAt),
    expiresAt: new Date(stored.expiresAt),
  };
}

// Callable wrapper for the generateCards Cloud Function
export const generateCardsCallable = httpsCallable<
  GenerateCardsRequest,
  Omit<GenerateCardsResponse, 'cards'> & { cards: StoredCard[] }
>(
  functions,
  'generateCards',
);

// Type-safe wrapper. Rejects with a FirebaseError whose code is e.g.
// 'functions/resource-exhausted' when the daily card limit is reached.
export async function generateCards(
  userId: string,
  interestId: string,
  count: number,
): Promise<GenerateCardsResponse> {
  const { data } = await generateCardsCallable({ userId, interestId, count });
  return { ...data, cards: data.cards.map(toCard) };
}

// Mirrors ScoreResponseRequest / ScoreResponseResult in functions/src.
interface ScoreResponseRequest {
  interactionId: string;
}

export interface ScoreResponseResult {
  score: number;
  message: string;
  // Frank's reply to a written answer. Missing for choices and skips.
  reply?: string;
  // False when the answer didn't address the question. Defaults to true
  // when an older deployed function leaves it out.
  onTopic: boolean;
}

const scoreResponseCallable = httpsCallable<ScoreResponseRequest, ScoreResponseResult>(
  functions,
  'scoreResponse',
);

// Scores an interaction the app has already written to Firestore.
export async function scoreResponse(interactionId: string): Promise<ScoreResponseResult> {
  const result = await scoreResponseCallable({ interactionId });
  return { ...result.data, onTopic: result.data.onTopic !== false };
}

// Mirrors UpdateStatsRequest / UpdateStatsResult in functions/src.
interface UpdateStatsRequest {
  userId: string;
  tzOffsetMinutes: number;
}

export interface UpdateStatsResult {
  currentStreak: number;
  totalResponses: number;
}

const updateStatsCallable = httpsCallable<UpdateStatsRequest, UpdateStatsResult>(
  functions,
  'updateStats',
);

// Recomputes stats/{userId}. Sends the device timezone so streak days
// follow the user's local midnight.
export async function updateStats(userId: string): Promise<UpdateStatsResult> {
  const result = await updateStatsCallable({
    userId,
    tzOffsetMinutes: new Date().getTimezoneOffset(),
  });
  return result.data;
}

// Mirrors DeleteAccountResult in functions/src.
interface DeleteAccountResult {
  deleted: boolean;
}

const deleteAccountCallable = httpsCallable<void, DeleteAccountResult>(functions, 'deleteAccount');

// Permanently deletes the signed-in user's account and all their data.
export async function deleteAccount(): Promise<void> {
  await deleteAccountCallable();
}
