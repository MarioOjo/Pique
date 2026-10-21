import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Interest } from '@/types';

// Keep in sync with the allowed IDs in firestore.rules.
export const INTERESTS: readonly Interest[] = [
  { id: 'philosophy', name: 'Philosophy', emoji: '🧠' },
  { id: 'science', name: 'Science', emoji: '🔬' },
  { id: 'technology', name: 'Technology', emoji: '💻' },
  { id: 'culture', name: 'Culture', emoji: '🎭' },
  { id: 'psychology', name: 'Psychology', emoji: '💭' },
  { id: 'economics', name: 'Economics', emoji: '📊' },
  { id: 'art', name: 'Art', emoji: '🎨' },
  { id: 'politics', name: 'Politics', emoji: '🏛️' },
  { id: 'pop-culture', name: 'Pop Culture', emoji: '🎬' },
  { id: 'gaming', name: 'Gaming', emoji: '🎮' },
  { id: 'food', name: 'Food', emoji: '🍜' },
  { id: 'history', name: 'History', emoji: '📜' },
  { id: 'sport', name: 'Sport', emoji: '⚽' },
];

// Creates any missing interest docs. Existing docs are left untouched, and
// security rules only allow creating these exact docs, never updating them.
export async function seedInterests(): Promise<void> {
  await Promise.all(
    INTERESTS.map(async (interest) => {
      const ref = doc(db, 'interests', interest.id);
      const snapshot = await getDoc(ref);
      if (snapshot.exists()) return;
      await setDoc(ref, { ...interest, createdAt: serverTimestamp() });
    }),
  );
}
