/**
 * Day schedule in India time (UTC+5:30, no daylight saving). Day 1 opens on the start date;
 * learning days run `daysPerWeek` days in a row, then the next week starts 7 days after the
 * previous one. So with 5 days/week: days 1–5 are start..start+4, day 6 is start+7.
 */
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight in India on the date of `t`, as a UTC instant. */
export function startOfIndiaDay(t: Date): Date {
  return new Date(Math.floor((t.getTime() + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS);
}

export function unlockDate(startedAt: Date, day: number, daysPerWeek: number): Date {
  const i = day - 1;
  const offsetDays = Math.floor(i / daysPerWeek) * 7 + (i % daysPerWeek);
  return new Date(startOfIndiaDay(startedAt).getTime() + offsetDays * DAY_MS);
}

/** A day is open if it's day 1, the previous day is finished, or its date has arrived. */
export function isUnlocked(input: {
  day: number;
  unlockAt: Date;
  previousCompleted: boolean;
  now: Date;
}): boolean {
  return (
    input.day === 1 || input.previousCompleted || input.now.getTime() >= input.unlockAt.getTime()
  );
}
