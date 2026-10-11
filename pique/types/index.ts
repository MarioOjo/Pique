export type CardType = 'perspective' | 'recall';

export type CardStatus = 'active' | 'flagged' | 'archived';

export interface Card {
  id: string;
  interestId: string;
  type: CardType;
  body: string;
  prompt: string;
  counterpoint?: string;
  imageUrl?: string;
  imageCredit?: string;
  difficulty: number;
  status: CardStatus;
  createdAt: Date;
  expiresAt: Date;
}

export interface Interest {
  id: string;
  name: string;
  emoji: string;
}

export interface UserInterest {
  interestId: string;
  weight: number;
}

export interface Interaction {
  id: string;
  userId: string;
  cardId: string;
  responseText: string;
  engagementScore: number;
  timeOnCard: number;
  skipped: boolean;
  createdAt: Date;
}

export interface BuddyConnection {
  id: string;
  userId: string;
  buddyId: string;
  status: 'pending' | 'active' | 'declined';
  createdAt: Date;
}

export interface UserStats {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  totalResponses: number;
  lastActive: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'standard' | 'admin';
  onboardingComplete: boolean;
  dailyCardCount: number;
  createdAt: Date;
}
