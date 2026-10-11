const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Calendar day of a timestamp in the user's timezone, as a day number
 * (days since the epoch) so consecutive days differ by exactly 1.
 * @param {Date} date The moment to convert.
 * @param {number} tzOffsetMinutes JS getTimezoneOffset() from the device
 *   (minutes behind UTC, e.g. -120 for UTC+2).
 * @return {number} The local day number.
 */
export function localDayNumber(date: Date, tzOffsetMinutes: number): number {
  return Math.floor((date.getTime() - tzOffsetMinutes * 60 * 1000) / DAY_MS);
}

export interface Streaks {
  currentStreak: number;
  longestStreak: number;
}

/**
 * Computes streaks from the days a user responded.
 * @param {number[]} days Local day numbers with at least one response
 *   (duplicates and any order are fine).
 * @param {number} today Today's local day number.
 * @return {Streaks} currentStreak counts consecutive days ending today
 *   (0 if nothing today); longestStreak is the longest run ever.
 */
export function computeStreaks(days: number[], today: number): Streaks {
  const unique = [...new Set(days)].sort((a, b) => a - b);

  let longestStreak = 0;
  let run = 0;
  let previous: number | null = null;
  for (const day of unique) {
    run = previous !== null && day === previous + 1 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    previous = day;
  }

  const active = new Set(unique);
  let currentStreak = 0;
  while (active.has(today - currentStreak)) currentStreak++;

  return {currentStreak, longestStreak};
}
