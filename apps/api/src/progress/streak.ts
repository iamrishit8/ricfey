const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** YYYY-MM-DD of `t` in India. */
export function indiaDateKey(t: Date): string {
  return new Date(t.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

function prevKey(key: string): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Streak = consecutive India calendar days on which the learner finished at least one day.
 * The current streak counts back from today, or from yesterday if nothing is done yet today
 * (so it doesn't reset at midnight before the learner has had a chance).
 */
export function streaks(completions: Date[], now: Date): { current: number; longest: number } {
  const days = new Set(completions.map(indiaDateKey));
  const sorted = [...days].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const k of sorted) {
    run = prev !== null && prevKey(k) === prev ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = k;
  }
  const today = indiaDateKey(now);
  let cursor = days.has(today) ? today : prevKey(today);
  let current = 0;
  while (days.has(cursor)) {
    current += 1;
    cursor = prevKey(cursor);
  }
  return { current, longest };
}
