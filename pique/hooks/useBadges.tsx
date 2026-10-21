import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BADGES, type Badge } from '@/lib/badges';
import type { StatsSummary } from '@/hooks/useStats';

export interface BadgeStatus extends Badge {
  isEarned: boolean;
}

const seenKey = (userId: string) => `pique_seen_badges_${userId}`;
// The most answers one session can hold. A device with no record of seen
// badges and no more answers than this belongs to someone new, whose
// first badges are worth announcing; anyone else is an existing account
// on a new device, and isn't flooded with old ones.
const NEW_USER_MAX_ANSWERS = 15;

// Every badge with whether it's earned. When announcing (the end-of-session
// screen), also the badges earned that hadn't been announced before; those
// are then recorded as seen on this device.
export function useBadges(
  userId: string | undefined,
  stats: StatsSummary,
  statsLoading: boolean,
  { announce = false }: { announce?: boolean } = {},
): { badges: BadgeStatus[]; newlyEarned: Badge[] } {
  const badges = BADGES.map((badge) => ({ ...badge, isEarned: badge.earned(stats) }));
  const earnedKey = badges
    .filter((badge) => badge.isEarned)
    .map((badge) => badge.id)
    .join(',');
  const isNewUser = stats.totalResponses <= NEW_USER_MAX_ANSWERS;
  // What had been announced when this screen opened; null until loaded.
  const [seenAtOpen, setSeenAtOpen] = useState<string[] | null>(null);

  useEffect(() => {
    if (!announce || !userId || statsLoading || seenAtOpen) return;
    const fallback = isNewUser ? [] : earnedKey.split(',');
    AsyncStorage.getItem(seenKey(userId))
      .then((stored) => setSeenAtOpen(stored === null ? fallback : JSON.parse(stored)))
      .catch((e: unknown) => {
        console.warn('Failed to load seen badges', e);
        setSeenAtOpen(fallback);
      });
  }, [announce, userId, statsLoading, seenAtOpen, earnedKey, isNewUser]);

  // Once announced here, a badge won't be announced again.
  useEffect(() => {
    if (!announce || !userId || !seenAtOpen) return;
    const seen = [...new Set([...seenAtOpen, ...earnedKey.split(',')])].filter(Boolean);
    AsyncStorage.setItem(seenKey(userId), JSON.stringify(seen)).catch((e: unknown) =>
      console.warn('Failed to save seen badges', e),
    );
  }, [announce, userId, seenAtOpen, earnedKey]);

  const newlyEarned = seenAtOpen
    ? badges.filter((badge) => badge.isEarned && !seenAtOpen.includes(badge.id))
    : [];
  return { badges, newlyEarned };
}
