/**
 * Shared constants and types for the AI feature request system.
 *
 * Note: Convex validators (in convex/) cannot import from src/ due to bundling.
 * Keep convex/featureRequests.ts validators in sync manually.
 */

export const PRIORITY_VALUES = ["high", "medium", "low"] as const;
export type Priority = (typeof PRIORITY_VALUES)[number];

export const EFFORT_VALUES = ["XS", "S", "M", "L", "XL"] as const;
export type Effort = (typeof EFFORT_VALUES)[number];

export const STATUS_VALUES = [
  "draft",
  "submitted",
  "in_review",
  "approved",
  "rejected",
  "in_progress",
  "completed",
] as const;
export type Status = (typeof STATUS_VALUES)[number];

export const GENERATION_STATUS_VALUES = [
  "idle",
  "generating",
  "complete",
  "error",
] as const;
export type GenerationStatus = (typeof GENERATION_STATUS_VALUES)[number];

/**
 * AI generation configuration constants.
 * Used in API route and streaming hook.
 */
export const AI_CONFIG = {
  /** Maximum length of feature description input */
  MAX_DESCRIPTION_LENGTH: 10000,
  /** Maximum length of PRD content */
  MAX_PRD_LENGTH: 50000,
  /** Maximum prompts to include in refinement context */
  MAX_PROMPTS_IN_CONTEXT: 10,
  /** Maximum total prompts allowed per feature request */
  MAX_PROMPTS_TOTAL: 50,
  /** AI model temperature (0-1, higher = more creative) */
  TEMPERATURE: 0.7,
  /** Maximum tokens in AI response */
  MAX_OUTPUT_TOKENS: 4096,
} as const;

/**
 * Timing constants for debouncing and intervals.
 */
export const TIMING = {
  /** Delay before auto-saving edits (ms) */
  AUTO_SAVE_DELAY_MS: 500,
  /** Delay before updating Convex during streaming (ms) */
  DEBOUNCE_DELAY_MS: 500,
  /** Interval for updating elapsed time display (ms) */
  ELAPSED_UPDATE_INTERVAL_MS: 100,
} as const;
