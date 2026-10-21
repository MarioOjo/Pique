import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserInterest } from '@/types';

export const MIN_TOPICS = 3;
// Sessions finished before topics can be changed, so Frank has learned
// something first and a switch isn't just boredom. Keep in sync with
// firestore.rules.
export const SESSIONS_TO_CHANGE_TOPICS = 3;

// Saves the user's topics. Rules only allow creating a topic (at 1.0) or
// deleting it, so topics that are still picked keep what Frank has learned.
export async function saveTopics(userId: string, selected: ReadonlySet<string>): Promise<void> {
  const interests = collection(db, 'users', userId, 'interests');
  const saved = new Set((await getDocs(interests)).docs.map((d) => d.id));
  const batch = writeBatch(db);
  selected.forEach((interestId) => {
    if (saved.has(interestId)) return;
    const interest: UserInterest = { interestId, weight: 1.0 };
    batch.set(doc(interests, interestId), interest);
  });
  saved.forEach((interestId) => {
    if (!selected.has(interestId)) batch.delete(doc(interests, interestId));
  });
  await batch.commit();
}
