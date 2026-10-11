// Frank — Pique's AI layer.
// All Claude API calls go through Firebase Cloud Functions, so the API key
// never touches the client bundle.

import { getFunctions, httpsCallable } from 'firebase/functions';
import app from './firebase';

const functions = getFunctions(app);

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
