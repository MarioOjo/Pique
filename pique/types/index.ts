import type { AgeBand, FrankStyle, SessionSize, WhyHere } from '@/lib/onboarding';
import type { Timestamp } from 'firebase/firestore';

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
  // Date in app code; Timestamp when read straight from Firestore.
  createdAt: Date | Timestamp;
  expiresAt: Date | Timestamp;
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
  // Set once the user taps "Meet Frank" on the intro screen.
  frankIntroSeen: boolean;
  // One of the presets in lib/avatars.ts; initials are shown when unset.
  avatarId?: string;
  onboardingComplete: boolean;
  // Onboarding answers (lib/onboarding.ts). Missing on older accounts and
  // until each question is answered.
  ageBand?: AgeBand;
  whyHere?: WhyHere;
  frankStyle?: FrankStyle;
  sessionSize?: SessionSize;
  dailyCardCount: number;
  createdAt: Date;
}
