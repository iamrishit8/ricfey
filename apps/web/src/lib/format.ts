/** Dates are shown in India time, matching how the API schedules days. */
export function indiaDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  });
}

export const LEVEL_LABEL = {
  foundation: 'Foundation',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
} as const;
export const DEPTH_LABEL = {
  basic: 'Basic',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
} as const;
