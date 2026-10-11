// Frank — Pique's AI layer.
// All Claude API calls go through Firebase Cloud Functions, so the API key
// never touches the client bundle.

import { httpsCallable } from 'firebase/functions';
// Shared instance, so the emulator connection in lib/firebase.ts applies.
import { functions } from './firebase';

// Mirrors CardGenerationRequest and the return value of generateCards in
// functions/src.
interface GenerateCardsRequest {
  userId: string;
  interestId: string;
  count: number;
}

export interface GenerateCardsResponse {
  success: boolean;
  cardsGenerated: number;
  message: string;
}

// Callable wrapper for the generateCards Cloud Function
export const generateCardsCallable = httpsCallable<GenerateCardsRequest, GenerateCardsResponse>(
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
  const result = await generateCardsCallable({ userId, interestId, count });
  return result.data;
}

// Mirrors ScoreResponseRequest / ScoreResponseResult in functions/src.
interface ScoreResponseRequest {
  interactionId: string;
}

export interface ScoreResponseResult {
  score: number;
  message: string;
}

const scoreResponseCallable = httpsCallable<ScoreResponseRequest, ScoreResponseResult>(
  functions,
  'scoreResponse',
);

// Scores an interaction the app has already written to Firestore.
export async function scoreResponse(interactionId: string): Promise<ScoreResponseResult> {
  const result = await scoreResponseCallable({ interactionId });
  return result.data;
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
