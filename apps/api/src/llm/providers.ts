import type { LlmProvider } from './types';

/** `main` writes content; `check` is the cheaper model for self-checks. */
export type LlmProviders = { main: LlmProvider; check: LlmProvider };
