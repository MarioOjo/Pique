import type { Card } from '../types';

// TODO: implement card feed fetching
export function useCards() {
  return { cards: [] as Card[], loading: false };
}
