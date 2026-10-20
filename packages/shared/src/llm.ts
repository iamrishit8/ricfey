// What an LLM call was for. Stored on every llmCalls record.
export const LLM_PURPOSES = [
  'placement_bank',
  'course_outline',
  'day_content',
  'self_check',
  'task_grading',
] as const;
export type LlmPurpose = (typeof LLM_PURPOSES)[number];
