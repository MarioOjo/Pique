// Server-side card and interest types
export type CardType = "perspective" | "recall";

export interface GeneratedCard {
  type: CardType;
  body: string; // the main content/question
  prompt: string; // what the user is asked to respond to
  counterpoint?: string; // for perspective cards — the other side
  difficulty: number; // 1-5
}

export interface InterestWeight {
  interestId: string;
  weight: number;
}

export interface CardGenerationRequest {
  userId: string;
  interestId: string;
  count: number;
}

// A saved card as returned to the app. Dates are ISO strings because
// callable responses are plain JSON.
export interface StoredCard extends GeneratedCard {
  id: string;
  interestId: string;
  status: "active";
  createdAt: string;
  expiresAt: string;
}

export interface GenerateCardsResult {
  success: boolean;
  cardsGenerated: number;
  message: string;
  cards: StoredCard[];
  // Cards the user can still generate today, so the app can tell them
  // when they're done for the day.
  remainingToday: number;
}

export interface ScoreResponseRequest {
  // An interactions/{id} doc the signed-in user wrote.
  interactionId: string;
}

export interface UpdateStatsRequest {
  userId: string;
  // Device getTimezoneOffset(), so streak days follow the user's local
  // midnight. Defaults to 0 (UTC).
  tzOffsetMinutes?: number;
}

export interface UpdateStatsResult {
  currentStreak: number;
  totalResponses: number;
}

export interface ScoreResponseResult {
  score: number;
  message: string;
}

export interface DeleteAccountResult {
  deleted: boolean;
}
