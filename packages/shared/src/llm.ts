// What an LLM call was for. Stored on every llmCalls record.
export const LLM_PURPOSES = ['course_outline', 'day_content'] as const;
export type LlmPurpose = (typeof LLM_PURPOSES)[number];
